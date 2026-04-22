import {
  ChatSwitcher,
  OpenRouterProvider,
  GroqProvider,
  TogetherProvider,
  MeridianBlueProvider,
  Provider,
} from '../src/index.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Only register providers for which a key is actually present.
  const providers: Provider[] = [];
  if (process.env.OPENROUTER_API_KEY)    providers.push(new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
  if (process.env.GROQ_API_KEY)          providers.push(new GroqProvider(process.env.GROQ_API_KEY));
  if (process.env.TOGETHER_API_KEY)      providers.push(new TogetherProvider(process.env.TOGETHER_API_KEY));
  if (process.env.MERIDIAN_BLUE_API_KEY) providers.push(new MeridianBlueProvider(process.env.MERIDIAN_BLUE_API_KEY));

  if (providers.length === 0) {
    console.error('No API keys found. Copy .env.example to .env and fill in at least one key.');
    process.exit(1);
  }

  const switcher = new ChatSwitcher({ providers });

  console.log('Sending request...');
  
  try {
    const result = await switcher.chat([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello! How are you today?' }
    ]);

    console.log(`\nResponse from ${result.provider}:`);
    console.log(result.content);
  } catch (error: any) {
    console.error('Unified Gateway Error:', error.message);
  }
}

main();
