import axios from 'axios';
import {
  Message,
  ChatOptions,
  Provider,
  ModelInfo,
  Capability,
} from '../types.js';

export class HuggingFaceProvider implements Provider {
  readonly name = 'HuggingFace';

  constructor(
    private apiKey: string,
    private model: string = 'mistralai/Mistral-7B-Instruct-v0.2'
  ) {}

  listModels(): ModelInfo[] {
    return [
      { id: 'mistralai/Mistral-7B-Instruct-v0.2', capabilities: ['text'] },
      { id: 'meta-llama/Meta-Llama-3-8B-Instruct', capabilities: ['text'] },
      { id: 'microsoft/Phi-3-mini-4k-instruct', capabilities: ['text'] },
      { id: 'google/gemma-2b-it', capabilities: ['text'] },
    ];
  }

  supports(cap: Capability): boolean {
    return cap === 'text';
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    const model = options.model || this.model;
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    // Helper to extract text from possible ContentPart[]
    const getMessageText = (content: string | any[]): string => {
      if (typeof content === 'string') return content;
      return content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
    };

    const prompt =
      messages
        .map((m) => `[${m.role}]: ${getMessageText(m.content)}`)
        .join('\n') + '\n[assistant]:';

    try {
      const response = await axios.post(
        apiUrl,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: options.max_tokens || 512,
            temperature: options.temperature || 0.7,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      if (Array.isArray(response.data) && response.data[0]?.generated_text) {
        let text = response.data[0].generated_text as string;
        if (text.includes('[assistant]:')) {
          text = text.split('[assistant]:').pop()?.trim() || text;
        }
        return text;
      }

      throw new Error('Invalid response from HuggingFace');
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`HuggingFace Error (${status}): ${JSON.stringify(data)}`);
    }
  }
}
