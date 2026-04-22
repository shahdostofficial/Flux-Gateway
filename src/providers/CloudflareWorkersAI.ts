import { BaseProvider } from './BaseProvider.js';

/**
 * Cloudflare Workers AI — OpenAI-compatible gateway to 40+ open models
 * (Llama 3, Mistral, Qwen, Gemma, etc.) running on Cloudflare's edge.
 *
 * Free tier: ~10k Neurons/day, no credit card required.
 * Sign up at https://dash.cloudflare.com/ and create an API token with
 * "Workers AI: Read" permission. You also need your Account ID.
 *
 * Docs: https://developers.cloudflare.com/workers-ai/
 */
export class CloudflareWorkersAIProvider extends BaseProvider {
  readonly name = 'CloudflareWorkersAI';
  protected apiUrl: string;

  /**
   * @param accountId Your Cloudflare account ID (found in the dashboard URL).
   * @param apiKey    API token with "Workers AI: Read" permission.
   */
  constructor(accountId: string, protected apiKey: string) {
    super();
    if (!accountId) {
      throw new Error('CloudflareWorkersAIProvider requires an accountId.');
    }
    this.apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  }

  getFallbackModels(): string[] {
    return [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/mistralai/mistral-small-3.1-24b-instruct',
      '@cf/google/gemma-3-12b-it',
      '@cf/qwen/qwen2.5-coder-32b-instruct',
    ];
  }
}
