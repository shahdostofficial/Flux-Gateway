export type Capability = 'text' | 'image_input' | 'image_output' | 'tools' | 'streaming';

export interface ModelInfo {
  id: string;
  capabilities: Capability[];
  contextWindow?: number;
  costTier?: 'free' | 'paid';
}

export type ContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source:
        | { kind: 'url'; url: string }
        | { kind: 'base64'; data: string; mime: string };
    };

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ImageOptions {
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
}

export type FailureClass =
  | 'model_error' // try next model
  | 'rate_limit' // try next provider, short cooldown
  | 'auth_error' // dead key -> long cooldown, don't retry
  | 'quota_exhausted' // out of credits -> disable till manual reset
  | 'server_error' // 5xx -> retry same provider
  | 'network_error' // timeout -> retry
  | 'content_policy'; // refusal -> don't retry, don't fallback

export interface ChatResult {
  content: string;
  provider: string;
  model: string;
}

export interface Provider {
  readonly name: string;
  complete(messages: Message[], options: ChatOptions): Promise<string>;
  generateImage?(prompt: string, options: ImageOptions): Promise<string>;
  listModels(): ModelInfo[];
  supports(cap: Capability): boolean;
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
  /** Optional event callback for production telemetry. */
  onEvent?: (event: GatewayEvent) => void;
}

export type GatewayEvent =
  | { type: 'attempt_start'; provider: string; model: string }
  | { type: 'attempt_success'; provider: string; model: string; duration: number }
  | {
      type: 'attempt_failure';
      provider: string;
      model: string;
      error: string;
      failureClass: FailureClass;
    }
  | { type: 'cooldown_triggered'; provider: string; until: number }
  | { type: 'capability_mismatch'; provider: string; required: Capability[] };

export interface ProviderHealth {
  name: string;
  consecutiveFailures: number;
  cooldownUntil: number;
  lastError?: string;
  lastFailureClass?: FailureClass;
}
