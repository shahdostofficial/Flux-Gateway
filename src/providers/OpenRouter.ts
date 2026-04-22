import { BaseProvider } from './BaseProvider.js';
import { ModelInfo } from '../types.js';

export class OpenRouterProvider extends BaseProvider {
  readonly name = 'OpenRouter';
  protected apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(protected apiKey: string) {
    super();
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'openai/gpt-oss-20b:free', capabilities: ['text'] },
      { id: 'openai/gpt-oss-120b:free', capabilities: ['text'] },
      { id: 'nvidia/nemotron-nano-9b-v2:free', capabilities: ['text'] },
      { id: 'google/gemma-3-4b-it:free', capabilities: ['text'] },
      { id: 'google/gemma-3n-e4b-it:free', capabilities: ['text'] },
      { id: 'qwen/qwen3-coder:free', capabilities: ['text'] },
      { id: 'liquid/lfm-2.5-1.2b-instruct:free', capabilities: ['text'] },
      { id: 'qwen/qwen2-vl-7b-instruct:free', capabilities: ['text', 'image_input'] },
    ];
  }

  protected async getAdditionalHeaders(): Promise<Record<string, string>> {
    return {
      'HTTP-Referer': 'https://github.com/flux-gateway/flux-gateway',
      'X-Title': 'FluxGateway',
    };
  }
}
