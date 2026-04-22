import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

/**
 * SambaNova Cloud — OpenAI-compatible gateway to Llama 3.1 (8B/70B/405B),
 * DeepSeek, Qwen and other open models.
 */
export class SambaNovaProvider extends BaseProvider {
  readonly name = 'SambaNova';
  protected apiUrl = 'https://api.sambanova.ai/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'Meta-Llama-3.3-70B-Instruct', capabilities: ['text'] },
      { id: 'Meta-Llama-3.1-8B-Instruct', capabilities: ['text'] },
      { id: 'Llama-3.3-Swallow-70B-Instruct-v0.4', capabilities: ['text'] },
    ];
  }
}
