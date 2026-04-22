import { BaseProvider } from './BaseProvider.js';

/**
 * Cerebras Cloud — OpenAI-compatible gateway to Llama / Qwen open models.
 * Extremely fast inference, generous free tier.
 * Sign up at https://cloud.cerebras.ai/ to get a free API key.
 */
export class CerebrasProvider extends BaseProvider {
  readonly name = 'Cerebras';
  protected apiUrl = 'https://api.cerebras.ai/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return ['llama3.1-8b', 'qwen-3-235b-a22b-instruct-2507', 'llama-3.3-70b'];
  }
}
