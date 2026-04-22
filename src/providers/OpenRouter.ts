import { BaseProvider } from './BaseProvider.js';

export class OpenRouterProvider extends BaseProvider {
  readonly name = 'OpenRouter';
  protected apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    // Curated list of currently-live OpenRouter free models, verified Apr 2026.
    // OpenRouter frequently rotates/decommissions :free models, and the global
    // free-tier rate limit per model is hit often — so we keep a long tail.
    return [
      'openai/gpt-oss-20b:free',
      'openai/gpt-oss-120b:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3n-e4b-it:free',
      'qwen/qwen3-coder:free',
      'liquid/lfm-2.5-1.2b-instruct:free',
    ];
  }

  protected async getAdditionalHeaders(): Promise<Record<string, string>> {
    return {
      'HTTP-Referer': 'https://github.com/flux-gateway/flux-gateway',
      'X-Title': 'FluxGateway',
    };
  }
}

/** @deprecated Misspelled alias. Use `OpenRouterProvider` instead. */
export const OpenRouterProvier = OpenRouterProvider;
