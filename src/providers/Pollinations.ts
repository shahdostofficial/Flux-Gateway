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
    // Pollinations API currently only serves openai-fast (GPT-OSS 20B).
    // Old models (p1, mistral, llama) have been retired from their API.
    return [
      { id: 'openai-fast', capabilities: ['text'] },
      { id: 'openai', capabilities: ['text'] },      // alias for openai-fast
      { id: 'flux', capabilities: ['image_output'] },  // image generation still works
    ];
  }

  supports(cap: Capability): boolean {
    return this.listModels().some((m) => m.capabilities.includes(cap));
  }

  /**
   * Auto-select the best model for the request.
   * If the request contains images, prefer a vision-capable model.
   */
  private selectModel(messages: Message[]): string {
    const hasImage = messages.some(m =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image')
    );
    // p1 supports vision; openai-fast is the default text model
    return hasImage ? 'p1' : 'openai-fast';
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    try {
      // Translate internal ContentPart format → OpenAI-compatible format
      const translatedMessages = messages.map((msg) => {
        if (typeof msg.content === 'string') return msg;

        const parts = (msg.content as any[]).map((part: any) => {
          if (part.type === 'text') return part;
          if (part.type === 'image') {
            let url: string;
            if (part.source.kind === 'url') {
              url = part.source.url;
            } else if (part.source.kind === 'base64') {
              url = `data:${part.source.mime};base64,${part.source.data}`;
            } else {
              return { type: 'text', text: '[unsupported image format]' };
            }
            return { type: 'image_url', image_url: { url } };
          }
          return part;
        });

        return { role: msg.role, content: parts };
      });

      const response = await axios.post(
        this.apiUrl,
        {
          model: options.model || this.selectModel(messages),
          messages: translatedMessages,
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
