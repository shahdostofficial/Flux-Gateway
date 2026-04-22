import { BaseProvider } from './BaseProvider.js';

export class ShuttleAIProvider extends BaseProvider {
  readonly name = 'ShuttleAI';
  protected apiUrl = 'https://api.shuttleai.app/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    return ['shuttle-2', 'shuttle-2-turbo', 'gpt-4o-mini'];
  }
}
