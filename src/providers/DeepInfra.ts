import { BaseProvider } from './BaseProvider.js';

export class DeepInfraProvider extends BaseProvider {
  readonly name = 'DeepInfra';
  protected apiUrl = 'https://api.deepinfra.com/v1/openai/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return [
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
    ];
  }
}
