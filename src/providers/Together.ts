import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class TogetherProvider extends BaseProvider {
  readonly name = 'TogetherAI';
  protected apiUrl = 'https://api.together.xyz/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', capabilities: ['text'] },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', capabilities: ['text'] },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', capabilities: ['text'] },
    ];
  }
}
