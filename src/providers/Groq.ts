import { BaseProvider } from './BaseProvider.js';

export class GroqProvider extends BaseProvider {
  readonly name = 'Groq';
  protected apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  constructor(protected apiKey: string) {
    super();
  }

  getFallbackModels(): string[] {
    // Ordered fastest / most-reliable → slowest / least-available.
    return [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3-32b',
    ];
  }
}
