import {
  Message,
  ChatOptions,
  Provider,
  SwitcherConfig,
  ProviderHealth,
  Capability,
  GatewayEvent,
  FailureClass,
  ImageOptions,
  ChatResult,
} from './types.js';

type Logger = Pick<Console, 'log' | 'warn'>;

const NOOP_LOGGER: Logger = { log: () => {}, warn: () => {} };

/**
 * ChatSwitcher routes requests through an ordered list of providers and
 * automatically fails over on error.
 */
export class ChatSwitcher {
  private readonly providers: Provider[];
  private readonly retryCount: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly logger: Logger;
  private readonly onEvent?: (e: GatewayEvent) => void;
  private readonly health = new Map<string, ProviderHealth>();

  constructor(config: SwitcherConfig) {
    if (!config.providers || config.providers.length === 0) {
      throw new Error('At least one provider must be configured.');
    }
    this.providers = config.providers;
    this.retryCount = config.retryCount ?? 1;
    this.failureThreshold = config.failureThreshold ?? 3;
    this.cooldownMs = config.cooldownMs ?? 60_000;
    this.onEvent = config.onEvent;
    
    this.logger =
      config.logger === null || config.logger === undefined
        ? NOOP_LOGGER
        : config.logger;

    for (const p of this.providers) {
      this.health.set(p.name, {
        name: p.name,
        consecutiveFailures: 0,
        cooldownUntil: 0,
      });
    }
  }

  private detectRequiredCapabilities(
    messages: Message[],
    options: ChatOptions
  ): Capability[] {
    const caps: Capability[] = ['text'];
    
    const hasImage = messages.some(m => 
      Array.isArray(m.content) && m.content.some(c => c.type === 'image')
    );
    if (hasImage) caps.push('image_input');
    
    return caps;
  }

  private emit(event: GatewayEvent) {
    if (this.onEvent) {
      try {
        this.onEvent(event);
      } catch (e) {
        this.logger.warn('[Switcher] Event callback threw error:', e);
      }
    }
  }

  getHealth(): ProviderHealth[] {
    return Array.from(this.health.values()).map((h) => ({ ...h }));
  }

  resetHealth(): void {
    for (const h of this.health.values()) {
      h.consecutiveFailures = 0;
      h.cooldownUntil = 0;
      h.lastError = undefined;
      h.lastFailureClass = undefined;
    }
  }

  async chat(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<ChatResult> {
    const required = this.detectRequiredCapabilities(messages, options);
    const eligible = this.providers.filter(p => 
      required.every(cap => p.supports(cap))
    );

    if (eligible.length === 0) {
      throw new Error(`No providers found with required capabilities: ${required.join(', ')}`);
    }

    let lastError: Error | null = null;
    const now = () => Date.now();

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      let skippedAll = true;

      for (const provider of eligible) {
        const health = this.health.get(provider.name)!;

        // Skip providers in cooldown
        if (health.cooldownUntil > now()) {
          skippedAll = false; // We didn't skip all providers, some are just in cooldown
          continue;
        }

        skippedAll = false;
        const startTime = now();
        const model = options.model ?? 'default';

        try {
          this.emit({ type: 'attempt_start', provider: provider.name, model });
          
          const content = await provider.complete(messages, options);
          
          health.consecutiveFailures = 0;
          health.cooldownUntil = 0;
          health.lastError = undefined;
          health.lastFailureClass = undefined;

          this.emit({ 
            type: 'attempt_success', 
            provider: provider.name, 
            model, 
            duration: now() - startTime 
          });

          return { content, provider: provider.name, model };
        } catch (error: any) {
          const failureClass: FailureClass = error.failureClass ?? 'model_error';
          const message = error?.message ?? String(error);
          
          lastError = error instanceof Error ? error : new Error(message);
          health.consecutiveFailures += 1;
          health.lastError = message;
          health.lastFailureClass = failureClass;

          this.emit({
            type: 'attempt_failure',
            provider: provider.name,
            model,
            error: message,
            failureClass
          });

          // Handle cooldown logic based on failure class
          let cooldownDuration = this.cooldownMs;
          if (failureClass === 'auth_error' || failureClass === 'quota_exhausted') {
            cooldownDuration = 30 * 60_000; // 30 minutes for persistent errors
          } else if (failureClass === 'rate_limit') {
            cooldownDuration = 10_000; // Short cooldown for rate limits
          }

          if (this.failureThreshold > 0 && health.consecutiveFailures >= this.failureThreshold) {
            health.cooldownUntil = now() + cooldownDuration;
            this.emit({ type: 'cooldown_triggered', provider: provider.name, until: health.cooldownUntil });
            this.logger.warn(`[Switcher] ${provider.name} Cooling down for ${cooldownDuration/1000}s due to ${failureClass}`);
          }
        }
      }

      if (skippedAll) break;
    }

    throw new Error(
      `All eligible providers failed or are cooling down. Last error: ${lastError?.message ?? 'unknown'}`
    );
  }

  async generateImage(
    prompt: string,
    options: ImageOptions = {}
  ): Promise<{ url: string; provider: string }> {
    const eligible = this.providers.filter(p => p.supports('image_output'));

    if (eligible.length === 0) {
      throw new Error('No providers found with required capability: image_output');
    }

    let lastError: Error | null = null;
    const now = () => Date.now();

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      for (const provider of eligible) {
        const health = this.health.get(provider.name)!;
        if (health.cooldownUntil > now()) continue;

        const startTime = now();
        const model = options.model ?? 'default';

        try {
          this.emit({ type: 'attempt_start', provider: provider.name, model });
          
          const url = await provider.generateImage!(prompt, options);
          
          health.consecutiveFailures = 0;
          health.cooldownUntil = 0;
          this.emit({ type: 'attempt_success', provider: provider.name, model, duration: now() - startTime });

          return { url, provider: provider.name };
        } catch (error: any) {
          const failureClass: FailureClass = error.failureClass ?? 'model_error';
          const message = error?.message ?? String(error);
          lastError = error instanceof Error ? error : new Error(message);
          health.consecutiveFailures += 1;
          
          this.emit({ type: 'attempt_failure', provider: provider.name, model, error: message, failureClass });

          if (this.failureThreshold > 0 && health.consecutiveFailures >= this.failureThreshold) {
            health.cooldownUntil = now() + (failureClass === 'auth_error' ? 30 * 60_000 : this.cooldownMs);
            this.emit({ type: 'cooldown_triggered', provider: provider.name, until: health.cooldownUntil });
          }
        }
      }
    }

    throw new Error(`All image providers failed. Last error: ${lastError?.message}`);
  }
}
