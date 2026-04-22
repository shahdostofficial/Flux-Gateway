import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

/**
 * Cerebras Cloud — OpenAI-compatible gateway to Llama / Qwen open models.
 * Extremely fast inference.
 */
export class CerebrasProvider extends BaseProvider {
  readonly name = 'Cerebras';
  protected apiUrl = 'https://api.cerebras.ai/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'llama3.1-8b', capabilities: ['text'] },
      { id: 'qwen-3-235b-a22b-instruct-2507', capabilities: ['text'] },
      { id: 'llama-3.3-70b', capabilities: ['text'] },
    ];
  }
}
