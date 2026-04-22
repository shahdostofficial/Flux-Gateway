import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class DeepInfraProvider extends BaseProvider {
  readonly name = 'DeepInfra';
  protected apiUrl = 'https://api.deepinfra.com/v1/openai/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', capabilities: ['text'] },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', capabilities: ['text'] },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', capabilities: ['text'] },
    ];
  }
}
