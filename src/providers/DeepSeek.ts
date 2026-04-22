import { BaseProvider } from './BaseProvider.js';

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'DeepSeek';
  protected apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return ['deepseek-chat', 'deepseek-reasoner'];
  }
}
