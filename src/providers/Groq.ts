import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class GroqProvider extends BaseProvider {
  readonly name = 'Groq';
  protected apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'llama-3.1-8b-instant', capabilities: ['text'] },
      { id: 'llama-3.3-70b-versatile', capabilities: ['text'] },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', capabilities: ['text'] },
      { id: 'qwen/qwen3-32b', capabilities: ['text'] },
    ];
  }
}
