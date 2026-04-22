import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class ShuttleAIProvider extends BaseProvider {
  readonly name = 'ShuttleAI';
  protected apiUrl = 'https://api.shuttleai.app/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'shuttle-2', capabilities: ['text'] },
      { id: 'shuttle-2-turbo', capabilities: ['text'] },
      { id: 'gpt-4o-mini', capabilities: ['text'] },
    ];
  }
}
