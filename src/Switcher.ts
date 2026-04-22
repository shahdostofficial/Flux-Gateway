import {
  Message,
  ChatOptions,
  Provider,
  SwitcherConfig,
  ProviderHealth,
} from './types.js';

type Logger = Pick<Console, 'log' | 'warn'>;

const NOOP_LOGGER: Logger = { log: () => {}, warn: () => {} };

/**
 * ChatSwitcher routes requests through an ordered list of providers and
 * automatically fails over on error. A simple health tracker temporarily
 * skips providers that fail repeatedly, so a dead key doesn't slow down
 * every request.
 */
export class ChatSwitcher {
  private readonly providers: Provider[];
  private readonly retryCount: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly logger: Logger;
  private readonly health = new Map<string, ProviderHealth>();

  constructor(config: SwitcherConfig) {
    if (!config.providers || config.providers.length === 0) {
      throw new Error('At least one provider must be configured.');
    }
    this.providers = config.providers;
    this.retryCount = config.retryCount ?? 1;
    this.failureThreshold = config.failureThreshold ?? 3;
    this.cooldownMs = config.cooldownMs ?? 60_000;
    // Default to silent so provider names / internal errors don't leak to
    // end-users. Opt-in by passing `logger: console` during development.
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

  /** Snapshot of per-provider health. Useful for diagnostics. */
  getHealth(): ProviderHealth[] {
    return Array.from(this.health.values()).map((h) => ({ ...h }));
  }

  /** Clear all cooldowns (e.g. after the user fixes an API key). */
  resetHealth(): void {
    for (const h of this.health.values()) {
      h.consecutiveFailures = 0;
      h.cooldownUntil = 0;
      h.lastError = undefined;
    }
  }

  async chat(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<{ content: string; provider: string }> {
    let lastError: Error | null = null;
    const now = () => Date.now();

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      let skippedAll = true;

      for (const provider of this.providers) {
        const health = this.health.get(provider.name)!;

        if (health.cooldownUntil > now()) {
          const remaining = Math.ceil((health.cooldownUntil - now()) / 1000);
          this.logger.log(
            `[Switcher] Skipping ${provider.name} (cooldown ${remaining}s remaining)`
          );
          continue;
        }

        skippedAll = false;
        try {
          this.logger.log(`[Switcher] Attempting request with provider: ${provider.name}`);
          const content = await provider.complete(messages, options);
          // Success resets health.
          health.consecutiveFailures = 0;
          health.cooldownUntil = 0;
          health.lastError = undefined;
          return { content, provider: provider.name };
        } catch (error: any) {
          const message = error?.message ?? String(error);
          lastError = error instanceof Error ? error : new Error(message);
          health.consecutiveFailures += 1;
          health.lastError = message;

          if (
            this.failureThreshold > 0 &&
            health.consecutiveFailures >= this.failureThreshold
          ) {
            health.cooldownUntil = now() + this.cooldownMs;
            this.logger.warn(
              `[Switcher] Provider ${provider.name} failed ${health.consecutiveFailures}x — ` +
                `cooling down for ${Math.round(this.cooldownMs / 1000)}s. Last error: ${message}`
            );
          } else {
            this.logger.warn(`[Switcher] Provider ${provider.name} failed: ${message}`);
          }
        }
      }

      // If every provider is in cooldown, no point looping further.
      if (skippedAll) break;
    }

    throw new Error(
      `All providers failed or are cooling down. Last error: ${lastError?.message ?? 'unknown'}`
    );
  }
}
