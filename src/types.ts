export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Provider {
  readonly name: string;
  complete(messages: Message[], options: ChatOptions): Promise<string>;
}

export interface SwitcherConfig {
  providers: Provider[];
  /** Number of full rotations to try before giving up. Default 1. */
  retryCount?: number;
  /**
   * Consecutive failures after which a provider enters cooldown and is
   * skipped. Default 3. Set to 0 to disable cooldown.
   */
  failureThreshold?: number;
  /**
   * How long (ms) a provider stays in cooldown once it trips the
   * failureThreshold. Default 60000 (1 minute).
   */
  cooldownMs?: number;
  /** Optional logger. Defaults to console. Pass `null` to silence. */
  logger?: Pick<Console, 'log' | 'warn'> | null;
}

export interface ProviderHealth {
  name: string;
  consecutiveFailures: number;
  cooldownUntil: number;
  lastError?: string;
}
