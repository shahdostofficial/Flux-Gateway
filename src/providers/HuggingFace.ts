import axios from 'axios';
import { Message, ChatOptions, Provider } from '../types.js';

export class HuggingFaceProvider implements Provider {
  readonly name = 'HuggingFace';
  
  constructor(private apiKey: string, private model: string = 'mistralai/Mistral-7B-Instruct-v0.2') {}

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    const model = options.model || this.model;
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    
    // HF expects a simple prompt string or its own format. 
    // We'll convert messages to a simple string for models that expect instructions.
    const prompt = messages.map(m => `[${m.role}]: ${m.content}`).join('\n') + '\n[assistant]:';

    try {
      const response = await axios.post(
        apiUrl,
        { inputs: prompt, parameters: { max_new_tokens: options.max_tokens || 512, temperature: options.temperature || 0.7 } },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      if (Array.isArray(response.data) && response.data[0]?.generated_text) {
        // Cleaning up the response to get only the assistant part
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
