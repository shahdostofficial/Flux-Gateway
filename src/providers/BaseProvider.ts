import axios from 'axios';
import {
  Message,
  ChatOptions,
  Provider,
  Capability,
  ModelInfo,
  FailureClass,
  ContentPart,
} from '../types.js';

/**
 * Base class for OpenAI-compatible chat providers.
 */
export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  protected abstract apiUrl: string;
  protected abstract apiKey: string;

  /**
   * Subclasses should define their supported models and capabilities.
   */
  abstract listModels(): ModelInfo[];

  supports(cap: Capability): boolean {
    return this.listModels().some((m) => m.capabilities.includes(cap));
  }

  protected getFallbackModels(): string[] {
    return this.listModels().map((m) => m.id);
  }

  protected async getAdditionalHeaders(): Promise<Record<string, string>> {
    return {};
  }

  /**
   * Translates Flux-Gateway's internal ContentPart format into the
   * OpenAI-compatible format that upstream providers actually accept.
   *
   * Internal:  { type: 'image', source: { kind: 'url', url: '...' } }
   * OpenAI:    { type: 'image_url', image_url: { url: '...' } }
   *
   * Internal:  { type: 'image', source: { kind: 'base64', data: '...', mime: '...' } }
   * OpenAI:    { type: 'image_url', image_url: { url: 'data:<mime>;base64,<data>' } }
   *
   * Subclasses can override this if they use a non-OpenAI multimodal format.
   */
  protected translateMessages(messages: Message[]): any[] {
    return messages.map((msg) => {
      // Plain text messages pass through unchanged
      if (typeof msg.content === 'string') {
        return msg;
      }

      // Translate each ContentPart
      const translatedParts = (msg.content as ContentPart[]).map((part) => {
        if (part.type === 'text') {
          return part; // text parts are already correct
        }

        if (part.type === 'image') {
          // Convert to OpenAI image_url format
          let imageUrl: string;

          if (part.source.kind === 'url') {
            imageUrl = part.source.url;
          } else if (part.source.kind === 'base64') {
            imageUrl = `data:${part.source.mime};base64,${part.source.data}`;
          } else {
            // Unknown source kind — skip gracefully
            return { type: 'text', text: '[unsupported image format]' };
          }

          return {
            type: 'image_url',
            image_url: { url: imageUrl },
          };
        }

        // Unknown part type — pass through as-is
        return part;
      });

      return { role: msg.role, content: translatedParts };
    });
  }

  /**
   * Classifies an error into a FailureClass for smart routing.
   */
  protected classifyError(err: any): FailureClass {
    const status: number = err?.response?.status;
    const data = err?.response?.data;
    const msg = String(data?.error?.message ?? data ?? '').toLowerCase();

    if (status === 401 || status === 403) return 'auth_error';
    if (status === 402) return 'quota_exhausted';
    if (status === 429) return 'rate_limit';
    if (status >= 500) return 'server_error';
    if (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND')
      return 'network_error';

    // Model-specific 400 errors (invalid model, context length, etc.)
    if (status === 400 || status === 404) {
      if (msg.includes('model') || msg.includes('found') || msg.includes('parameter')) {
        return 'model_error';
      }
      if (msg.includes('policy') || msg.includes('safety') || msg.includes('refusal')) {
        return 'content_policy';
      }
    }

    return 'model_error'; // Default to model error to trigger fallback
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    let candidates =
      options.model != null ? [options.model] : this.getFallbackModels();

    // If the request contains images and no specific model was requested,
    // prioritize vision-capable models first so the image is actually analyzed.
    if (options.model == null) {
      const hasImage = messages.some(m =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image')
      );
      if (hasImage) {
        const visionModels = this.listModels()
          .filter(m => m.capabilities.includes('image_input'))
          .map(m => m.id);
        const textOnlyModels = candidates.filter(c => !visionModels.includes(c));
        // Vision models first, text-only as fallback
        candidates = [...visionModels, ...textOnlyModels];
      }
    }

    if (candidates.length === 0) {
      throw new Error(
        `${this.name}: no models configured. Override listModels().`
      );
    }

    let lastError: any;
    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      try {
        return await this.callModel(model, messages, options);
      } catch (err: any) {
        lastError = err;
        const failureClass = this.classifyError(err);

        // If it's a model-specific error and we have more candidates, try next.
        if (i < candidates.length - 1 && failureClass === 'model_error') {
          continue;
        }

        // Otherwise, bubble it up to Switcher
        throw this.wrapError(err, failureClass);
      }
    }
    throw this.wrapError(lastError, this.classifyError(lastError));
  }

  protected async callModel(
    model: string,
    messages: Message[],
    options: ChatOptions
  ): Promise<string> {
    // Translate internal format → provider-compatible format
    const translatedMessages = this.translateMessages(messages);

    const response = await axios.post(
      this.apiUrl,
      {
        model,
        messages: translatedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(await this.getAdditionalHeaders()),
        },
        timeout: 30000,
      }
    );

    const choice = response.data?.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error(`Invalid response format from ${this.name}`);
    }
    return choice.message.content;
  }

  protected wrapError(err: any, failureClass: FailureClass): Error & { failureClass?: FailureClass } {
    const message = err?.response?.data?.error?.message ?? err?.response?.statusText ?? err.message;
    const extendedError: any = new Error(
      `${this.name} Error (${err?.response?.status ?? 'Native'}): ${message}`
    );
    extendedError.failureClass = failureClass;
    extendedError.originalError = err;
    return extendedError;
  }
}
