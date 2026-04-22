import axios from 'axios';
import { Message, ChatOptions, Provider } from '../types.js';

/**
 * Pollinations.ai — a fully free, no-API-key AI gateway.
 * OpenAI-compatible endpoint, ideal as a last-resort fallback because it
 * requires no signup and no credentials.
 *
 * See https://pollinations.ai/ for the list of available models.
 */
export class PollinationsProvider implements Provider {
  readonly name = 'Pollinations';
  private readonly apiUrl = 'https://text.pollinations.ai/openai';
  private readonly apiKey?: string;

  /**
   * @param apiKey Optional. Pollinations currently requires no key; the
   * parameter exists so the provider stays forward-compatible if auth is
   * ever added.
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  getDefaultModel(): string {
    return 'openai';
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: options.model || this.getDefaultModel(),
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
        const message = error.response.data?.error?.message || error.response.statusText;
        throw new Error(`${this.name} Error (${error.response.status}): ${message}`);
      }
      throw error;
    }
  }
}
