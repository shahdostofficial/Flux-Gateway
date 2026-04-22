import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'DeepSeek';
  protected apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'deepseek-chat', capabilities: ['text'] },
      { id: 'deepseek-reasoner', capabilities: ['text'] },
    ];
  }
}
