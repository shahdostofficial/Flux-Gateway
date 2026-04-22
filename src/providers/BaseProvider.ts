import axios from 'axios';
import { Message, ChatOptions, Provider } from '../types.js';

/**
 * Base class for OpenAI-compatible chat providers.
 *
 * Smart model fallback:
 *   Each provider exposes `getFallbackModels()` returning an ordered list of
 *   model IDs. `complete()` walks the list and, on a *model-specific* error
 *   (429 rate limit, 404 not found, 400 bad model), transparently moves on
 *   to the next model. Non-model errors (401 auth, network, 5xx, timeout)
 *   bubble up immediately so the `ChatSwitcher` can try another provider.
 */
export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  protected abstract apiUrl: string;
  protected abstract apiKey: string;

  /** Preferred default model (first entry of `getFallbackModels`). */
  getDefaultModel(): string {
    return this.getFallbackModels()[0];
  }

  /**
   * Ordered list of models to try for this provider.
   * The first entry is the preferred default; subsequent entries are tried
   * only on model-specific failures. Subclasses should override this.
   */
  getFallbackModels(): string[] {
    return [];
  }

  protected async getAdditionalHeaders(): Promise<Record<string, string>> {
    return {};
  }

  /** Error codes/patterns that indicate the MODEL (not the provider) failed. */
  protected isModelSpecificError(err: any): boolean {
    const status: number | undefined = err?.response?.status;
    if (status === 429) return true; // rate-limited on this model
    if (status === 404) return true; // model decommissioned / unknown
    if (status === 400) {
      // Some providers return 400 for "invalid model" — inspect message.
      const msg = String(
        err?.response?.data?.error?.message ?? err?.response?.data ?? ''
      ).toLowerCase();
      if (msg.includes('model')) return true;
    }
    return false;
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    // If caller explicitly picked a model, honour it exclusively.
    // Otherwise walk the provider's full fallback list.
    const candidates =
      options.model != null ? [options.model] : this.getFallbackModels();

    if (candidates.length === 0) {
      throw new Error(
        `${this.name}: no models configured. Override getFallbackModels().`
      );
    }

    let lastError: any;
    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      try {
        return await this.callModel(model, messages, options);
      } catch (err: any) {
        lastError = err;
        if (i < candidates.length - 1 && this.isModelSpecificError(err)) {
          // Silent hop to next model; ChatSwitcher will still log if the
          // whole provider ultimately fails.
          continue;
        }
        throw this.wrapError(err);
      }
    }
    throw this.wrapError(lastError);
  }

  protected async callModel(
    model: string,
    messages: Message[],
    options: ChatOptions
  ): Promise<string> {
    const response = await axios.post(
      this.apiUrl,
      {
        model,
        messages,
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

  protected wrapError(err: any): Error {
    if (err?.response) {
      const message =
        err.response.data?.error?.message ?? err.response.statusText;
      return new Error(`${this.name} Error (${err.response.status}): ${message}`);
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
