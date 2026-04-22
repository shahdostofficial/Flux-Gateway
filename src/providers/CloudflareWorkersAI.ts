import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

/**
 * Cloudflare Workers AI — OpenAI-compatible gateway to 40+ open models
 * (Llama 3, Mistral, Qwen, Gemma, etc.) running on Cloudflare's edge.
 */
export class CloudflareWorkersAIProvider extends BaseProvider {
  readonly name = 'CloudflareWorkersAI';
  protected apiUrl: string;

  constructor(accountId: string, protected apiKey: string) {
    super();
    if (!accountId) {
      throw new Error('CloudflareWorkersAIProvider requires an accountId.');
    }
    this.apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  }

  listModels(): ModelInfo[] {
    return [
      { id: '@cf/meta/llama-3.1-8b-instruct', capabilities: ['text'] },
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', capabilities: ['text'] },
      { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', capabilities: ['text'] },
      { id: '@cf/google/gemma-3-12b-it', capabilities: ['text'] },
      { id: '@cf/qwen/qwen2.5-coder-32b-instruct', capabilities: ['text'] },
    ];
  }
}
