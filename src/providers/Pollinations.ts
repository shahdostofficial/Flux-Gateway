import axios from 'axios';
import {
  Message,
  ChatOptions,
  Provider,
  ModelInfo,
  Capability,
  ImageOptions,
} from '../types.js';

/**
 * Pollinations.ai — a fully free, no-API-key AI gateway.
 */
export class PollinationsProvider implements Provider {
  readonly name = 'Pollinations';
  private readonly apiUrl = 'https://text.pollinations.ai/openai';
  private readonly imageApiUrl = 'https://image.pollinations.ai/prompt';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'openai', capabilities: ['text'] },
      { id: 'mistral', capabilities: ['text'] },
      { id: 'llama', capabilities: ['text'] },
      { id: 'p1', capabilities: ['text', 'image_input'] },
      { id: 'flux', capabilities: ['image_output'] },
    ];
  }

  supports(cap: Capability): boolean {
    return this.listModels().some((m) => m.capabilities.includes(cap));
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: options.model || 'openai',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          timeout: 45000,
        }
      );

      const data = response.data;

      // OpenAI-shaped response
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }

      // Pollinations can also return a plain string in some modes
      if (typeof data === 'string' && data.length > 0) {
        return data;
      }

      throw new Error(`Invalid response format from ${this.name}`);
    } catch (error: any) {
      if (error.response) {
        const message =
          error.response.data?.error?.message || error.response.statusText;
        throw new Error(
          `${this.name} Error (${error.response.status}): ${message}`
        );
      }
      throw error;
    }
  }

  async generateImage(prompt: string, options: ImageOptions): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt);
    const model = options.model || 'flux';
    // Pollinations returns the image directly at this URL
    const url = `${this.imageApiUrl}/${encodedPrompt}?model=${model}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    return url;
  }
}
