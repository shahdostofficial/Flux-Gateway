import { BaseProvider } from './BaseProvider.js';

/**
 * MeridianBlue — an OpenAI-compatible AI Gateway that proxies many upstream
 * providers (Groq, Cerebras, Cloudflare, NVIDIA, Mistral, Gemini, GitHub, …)
 * under a single API key and unified model catalog.
 *
 * Chat endpoint: `{baseUrl}/api/v1/chat/completions`
 *
 * The default base URL points at MeridianBlue's staging server. Pass a
 * different URL to the constructor (or set MERIDIAN_BLUE_BASE_URL in your
 * env and wire it through) if you're on production or self-hosted.
 */
export class MeridianBlueProvider extends BaseProvider {
  readonly name = 'MeridianBlue';
  protected apiUrl: string;

  /**
   * @param apiKey   MeridianBlue developer key.
   * @param baseUrl  Gateway base URL (no trailing slash).
   *                 Defaults to the staging server.
   */
  constructor(protected apiKey: string, baseUrl = 'http://178.63.197.107:3000') {
    super();
    this.apiUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/chat/completions`;
  }

  getFallbackModels(): string[] {
    // Ordered by expected speed/quality. Because MeridianBlue proxies many
    // upstreams, one being rate-limited does NOT mean the next will be —
    // so model-level fallback is especially effective here.
    return [
      // Fast Cerebras-backed
      'cerebras-llama3-8b',
      'cerebras-qwen3-235b',
      // Groq-backed (limited free tier)
      'llama-3.1-8b',
      'llama-3.3-70b',
      'llama-4-scout',
      // Cloudflare-backed
      'cf-llama-3.3-70b',
      // NVIDIA-backed (free)
      'kimi-k2-instruct',
      'gemma-3-27b-it',
      'mistral-medium-3-instruct',
      'qwen3-coder-480b-a35b-instruct',
      // Mistral direct
      'mistral-small',
      'magistral-small',
      // Last resort: GPT-4o via GitHub (free but heavily rate-limited)
      'github-gpt-4o',
    ];
  }
}
