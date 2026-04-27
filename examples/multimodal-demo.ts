import {
  ChatSwitcher,
  OpenRouterProvider,
  PollinationsProvider,
  Provider,
} from '../src/index.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Programmatic Multimodal Demo
 * 
 * Run with: npm run build && node dist/examples/multimodal-demo.js
 * (Or via ts-node: node --loader ts-node/esm examples/multimodal-demo.ts)
 */
async function runDemo() {
  // 1. Setup providers
  // Using Pollinations as a reliable free fallback for vision/generation testing
  const providers: Provider[] = [
    new PollinationsProvider(),
  ];

  // Add OpenRouter if key is available (good for heavy-duty vision)
  if (process.env.OPENROUTER_API_KEY) {
    providers.unshift(new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
  }

  const switcher = new ChatSwitcher({
    providers,
    onEvent: (e) => console.log(`[EVENT] ${e.type}: ${e.provider} (${(e as any).model || ''})`)
  });

  console.log('--- 🧪 Scenario 1: Vision (Image Input/Uploading) ---');
  // Using Pixabay CDN — Wikipedia blocks server-side fetches from some providers (403)
  const imageUrl = 'https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg';

  try {
    // Let the switcher auto-select a vision-capable provider.
    // OpenRouter has free vision models (gemma-3/4, nemotron-vl).
    // If no specific model is set, the switcher picks the first vision-capable model.
    const chatResult = await switcher.chat([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe what you see in this image in 5 words.' },
          { type: 'image', source: { kind: 'url', url: imageUrl } }
        ]
      }
    ]);

    console.log('Vision Response:', chatResult.content);
    console.log('Provider used:', chatResult.provider, '| Model:', chatResult.model);
  } catch (err: any) {
    console.error('Vision Failed:', err.message);
  }

  console.log('\n--- 🧪 Scenario 2: Image Generation (Image Output) ---');
  try {
    const genResult = await switcher.generateImage(
      'A futuristic cyberpunk city in the style of Van Gogh, oil painting, high detail',
      { model: 'flux' }
    );

    console.log('Generation Success!');
    console.log('Provider used:', genResult.provider);
    console.log('Image URL:', genResult.url);
  } catch (err: any) {
    console.error('Generation Failed:', err.message);
  }
}

runDemo().catch(console.error);
