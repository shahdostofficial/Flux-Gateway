import { BaseProvider } from './BaseProvider.js';

/**
 * SambaNova Cloud — OpenAI-compatible gateway to Llama 3.1 (8B/70B/405B),
 * DeepSeek, Qwen and other open models. Has a free developer tier.
 * Sign up at https://cloud.sambanova.ai/ to get a free API key.
 */
export class SambaNovaProvider extends BaseProvider {
  readonly name = 'SambaNova';
  protected apiUrl = 'https://api.sambanova.ai/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return [
      'Meta-Llama-3.3-70B-Instruct',
      'Meta-Llama-3.1-8B-Instruct',
      'Llama-3.3-Swallow-70B-Instruct-v0.4',
    ];
  }
}
