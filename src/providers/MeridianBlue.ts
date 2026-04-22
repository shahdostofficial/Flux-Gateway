import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

/**
 * MeridianBlue — an OpenAI-compatible AI Gateway that proxies many upstream
 * providers (Groq, Cerebras, Cloudflare, NVIDIA, Mistral, Gemini, GitHub, …)
 * under a single API key and unified model catalog.
 */
export class MeridianBlueProvider extends BaseProvider {
  readonly name = 'MeridianBlue';
  protected apiUrl: string;

  constructor(protected apiKey: string, baseUrl = 'http://178.63.197.107:3000') {
    super();
    this.apiUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/chat/completions`;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'cerebras-llama3-8b', capabilities: ['text'] },
      { id: 'cerebras-qwen3-235b', capabilities: ['text'] },
      { id: 'llama-3.1-8b', capabilities: ['text'] },
      { id: 'llama-3.3-70b', capabilities: ['text'] },
      { id: 'llama-4-scout', capabilities: ['text'] },
      { id: 'cf-llama-3.3-70b', capabilities: ['text'] },
      { id: 'kimi-k2-instruct', capabilities: ['text'] },
      { id: 'gemma-3-27b-it', capabilities: ['text'] },
      { id: 'mistral-medium-3-instruct', capabilities: ['text'] },
      { id: 'qwen3-coder-480b-a35b-instruct', capabilities: ['text'] },
      { id: 'mistral-small', capabilities: ['text'] },
      { id: 'magistral-small', capabilities: ['text'] },
      { id: 'github-gpt-4o', capabilities: ['text'] },
    ];
  }
}
