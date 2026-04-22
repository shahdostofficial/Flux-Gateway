#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ChatSwitcher } from './Switcher.js';
import { OpenRouterProvider } from './providers/OpenRouter.js';
import { GroqProvider } from './providers/Groq.js';
import { TogetherProvider } from './providers/Together.js';
import { MeridianBlueProvider } from './providers/MeridianBlue.js';
import { DeepSeekProvider } from './providers/DeepSeek.js';
import { HuggingFaceProvider } from './providers/HuggingFace.js';
import { ShuttleAIProvider } from './providers/ShuttleAI.js';
import { DeepInfraProvider } from './providers/DeepInfra.js';
import { CerebrasProvider } from './providers/Cerebras.js';
import { SambaNovaProvider } from './providers/SambaNova.js';
import { PollinationsProvider } from './providers/Pollinations.js';
import { CloudflareWorkersAIProvider } from './providers/CloudflareWorkersAI.js';
import { realEnv } from './utils/env.js';
import { Provider } from './types.js';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('flux-gateway')
  .description('A universal AI request switcher for continuous LLM access')
  .version('1.2.0');

program
  .command('ask')
  .description('Send a prompt to the AI rotation gateway')
  .argument('<prompt>', 'The prompt to send')
  .option('-m, --model <model>', 'Specific model for supported providers')
  .option('-i, --image <url>', 'Image URL for multimodal requests')
  .action(async (prompt, options) => {
    const providers: Provider[] = [];
    
    // Add providers if keys exist in env
    const openrouter = realEnv('OPENROUTER_API_KEY');    if (openrouter)   providers.push(new OpenRouterProvider(openrouter));
    const groq = realEnv('GROQ_API_KEY');                 if (groq)         providers.push(new GroqProvider(groq));
    const together = realEnv('TOGETHER_API_KEY');         if (together)     providers.push(new TogetherProvider(together));
    const meridian = realEnv('MERIDIAN_BLUE_API_KEY');
    if (meridian) {
      const mbBase = realEnv('MERIDIAN_BLUE_BASE_URL');
      providers.push(mbBase ? new MeridianBlueProvider(meridian, mbBase) : new MeridianBlueProvider(meridian));
    }
    const deepseek = realEnv('DEEPSEEK_API_KEY');         if (deepseek)     providers.push(new DeepSeekProvider(deepseek));
    const hf = realEnv('HUGGINGFACE_API_KEY');            if (hf)           providers.push(new HuggingFaceProvider(hf));
    const shuttle = realEnv('SHUTTLEAI_API_KEY');         if (shuttle)      providers.push(new ShuttleAIProvider(shuttle));
    const deepinfra = realEnv('DEEPINFRA_API_KEY');       if (deepinfra)    providers.push(new DeepInfraProvider(deepinfra));
    const cerebras = realEnv('CEREBRAS_API_KEY');         if (cerebras)     providers.push(new CerebrasProvider(cerebras));
    const sambanova = realEnv('SAMBANOVA_API_KEY');       if (sambanova)    providers.push(new SambaNovaProvider(sambanova));
    const cfAccount = realEnv('CLOUDFLARE_ACCOUNT_ID');
    const cfKey = realEnv('CLOUDFLARE_API_KEY');
    if (cfAccount && cfKey) {
      providers.push(new CloudflareWorkersAIProvider(cfAccount, cfKey));
    }

    const pollinationsOptIn = process.env.FLUX_ENABLE_POLLINATIONS === '1';
    if (pollinationsOptIn || providers.length === 0) {
      providers.push(new PollinationsProvider());
      if (providers.length === 1 && !pollinationsOptIn) {
        console.log(
          chalk.yellow(
            '⚠  No API keys configured — falling back to Pollinations (community, no SLA). ' +
              'Set at least one *_API_KEY in .env for production use.'
          )
        );
      }
    }

    if (providers.length === 0) {
      console.error(chalk.red('Error: No providers available.'));
      process.exit(1);
    }

    const debug = process.env.FLUX_DEBUG === '1';
    const switcher = new ChatSwitcher({
      providers,
      onEvent: debug ? (e) => {
        if (e.type === 'attempt_start') console.error(chalk.dim(`[Gateway] Trying ${e.provider} (${e.model})...`));
        if (e.type === 'attempt_failure') console.error(chalk.yellow(`[Gateway] ${e.provider} failed: ${e.failureClass} - ${e.error}`));
        if (e.type === 'attempt_success') console.error(chalk.green(`[Gateway] Success with ${e.provider} in ${e.duration}ms`));
        if (e.type === 'cooldown_triggered') console.error(chalk.red(`[Gateway] ${e.provider} entered cooldown until ${new Date(e.until).toLocaleTimeString()}`));
      } : undefined
    });

    try {
      const messages: any[] = [];
      if (options.image) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', source: { kind: 'url', url: options.image } }
          ]
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const result = await switcher.chat(messages, { model: options.model });
      console.log(result.content);
    } catch (error: any) {
      console.error(chalk.red('Error:'), 'Unable to get a response right now.');
      if (debug) console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate an image using a prompt')
  .argument('<prompt>', 'The prompt for image generation')
  .option('-m, --model <model>', 'Specific model for generation (e.g., flux)')
  .action(async (prompt, options) => {
    const providers: Provider[] = [];
    
    const openrouter = realEnv('OPENROUTER_API_KEY');    if (openrouter)   providers.push(new OpenRouterProvider(openrouter));
    providers.push(new PollinationsProvider()); // Always available for image gen

    const debug = process.env.FLUX_DEBUG === '1';
    const switcher = new ChatSwitcher({
      providers,
      onEvent: debug ? (e) => {
        if (e.type === 'attempt_start') console.error(chalk.dim(`[Gateway] Generating with ${e.provider}...`));
        if (e.type === 'attempt_failure') console.error(chalk.yellow(`[Gateway] ${e.provider} failed: ${e.error}`));
      } : undefined
    });

    try {
      const result = await switcher.generateImage(prompt, { model: options.model });
      console.log(chalk.green('Image Generated Successfully!'));
      console.log(chalk.bold('URL:'), result.url);
      console.log(chalk.dim(`Provider: ${result.provider}`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), 'Failed to generate image.');
      if (debug) console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
