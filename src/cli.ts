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
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('flux-gateway')
  .description('A universal AI request switcher for continuous LLM access')
  .version('1.1.0');

program
  .command('ask')
  .description('Send a prompt to the AI rotation gateway')
  .argument('<prompt>', 'The prompt to send')
  .option('-m, --model <model>', 'Specific model for supported providers')
  .action(async (prompt, options) => {
    const providers = [];
    
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

    // Pollinations policy:
    //   - It's NOT production-grade (community-run, no SLA).
    //   - But it's the only provider that needs no API key.
    //   - So: include it only as a true last resort — either when the user
    //     has configured no other provider at all, or when they opt in
    //     explicitly via FLUX_ENABLE_POLLINATIONS=1.
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
      console.log('Set at least one *_API_KEY in .env, or set FLUX_ENABLE_POLLINATIONS=1.');
      process.exit(1);
    }

    // Silent by default: no internal logger. Set FLUX_DEBUG=1 to see rotation
    // logs (useful when debugging why a provider failed).
    const debug = process.env.FLUX_DEBUG === '1';
    const switcher = new ChatSwitcher({
      providers,
      logger: debug ? console : null,
    });

    try {
      const result = await switcher.chat(
        [{ role: 'user', content: prompt }],
        { model: options.model }
      );
      // Only print the answer. We intentionally do NOT expose which provider
      // or model produced it — that is an internal implementation detail.
      console.log(result.content);
    } catch (error: any) {
      // Generic user-facing error — no provider names leaked.
      console.error(chalk.red('Error:'), 'Unable to get a response right now. Please try again.');
      if (debug) console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
