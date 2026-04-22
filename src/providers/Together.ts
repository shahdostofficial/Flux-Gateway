import { BaseProvider } from './BaseProvider.js';

export class TogetherProvider extends BaseProvider {
  readonly name = 'TogetherAI';
  protected apiUrl = 'https://api.together.xyz/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mistral-7B-Instruct-v0.3',
    ];
  }
}
