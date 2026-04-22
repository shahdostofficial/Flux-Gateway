/// <reference types="node" />
/**
 * Interactive chat REPL powered by FluxGateway.
 * Run:  npm run chat
 *
 * Slash commands:
 *   /exit        Quit
 *   /reset       Clear conversation history
 *   /health      Show per-provider health
 *   /providers   List active providers in the rotation
 */
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import {
  ChatSwitcher,
  Message,
  Provider,
  OpenRouterProvider,
  GroqProvider,
  TogetherProvider,
  MeridianBlueProvider,
  DeepSeekProvider,
  HuggingFaceProvider,
  ShuttleAIProvider,
  DeepInfraProvider,
  CerebrasProvider,
  SambaNovaProvider,
  CloudflareWorkersAIProvider,
  PollinationsProvider,
  realEnv,
} from '../src/index.js';

dotenv.config();

function buildProviders(): { providers: Provider[]; names: string[] } {
  const providers: Provider[] = [];

  const g  = realEnv('GROQ_API_KEY');          if (g)  providers.push(new GroqProvider(g));
  const ce = realEnv('CEREBRAS_API_KEY');      if (ce) providers.push(new CerebrasProvider(ce));
  const mb = realEnv('MERIDIAN_BLUE_API_KEY');
  if (mb) {
    const base = realEnv('MERIDIAN_BLUE_BASE_URL');
    providers.push(base ? new MeridianBlueProvider(mb, base) : new MeridianBlueProvider(mb));
  }
  const or = realEnv('OPENROUTER_API_KEY');    if (or) providers.push(new OpenRouterProvider(or));
  const sn = realEnv('SAMBANOVA_API_KEY');     if (sn) providers.push(new SambaNovaProvider(sn));
  const cfA = realEnv('CLOUDFLARE_ACCOUNT_ID');
  const cfK = realEnv('CLOUDFLARE_API_KEY');
  if (cfA && cfK) providers.push(new CloudflareWorkersAIProvider(cfA, cfK));
  const tg = realEnv('TOGETHER_API_KEY');      if (tg) providers.push(new TogetherProvider(tg));
  const ds = realEnv('DEEPSEEK_API_KEY');      if (ds) providers.push(new DeepSeekProvider(ds));
  const hf = realEnv('HUGGINGFACE_API_KEY');   if (hf) providers.push(new HuggingFaceProvider(hf));
  const sh = realEnv('SHUTTLEAI_API_KEY');     if (sh) providers.push(new ShuttleAIProvider(sh));
  const di = realEnv('DEEPINFRA_API_KEY');     if (di) providers.push(new DeepInfraProvider(di));

  // Pollinations: always-on safety net so the REPL works even with zero keys.
  providers.push(new PollinationsProvider());

  return { providers, names: providers.map((p) => p.name) };
}

const SYSTEM_PROMPT =
  'You are a helpful, concise assistant. Keep responses clear and under 6 sentences unless the user asks for more detail.';

async function main() {
  const { providers, names } = buildProviders();

  const switcher = new ChatSwitcher({
    providers,
    failureThreshold: 3,
    cooldownMs: 60_000,
    logger: null, // keep REPL output clean
  });

  const history: Message[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (prompt: string): Promise<string | null> =>
    new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer));
      rl.once('close', () => resolve(null));
    });

  // Debug mode only exposes internals when the operator opts in.
  const debug = process.env.FLUX_DEBUG === '1';

  console.log('\n⚡ FluxGateway chat  (type /help for commands, /exit to quit)');
  if (debug) console.log(`[debug] providers: ${names.join(' → ')}`);
  console.log('');

  while (true) {
    const raw = await ask('\x1b[36myou\x1b[0m › ');
    if (raw === null) break; // EOF / Ctrl-D
    const user = raw.trim();
    if (!user) continue;

    // Slash commands
    if (user.startsWith('/')) {
      const [cmd] = user.slice(1).split(/\s+/);
      switch (cmd) {
        case 'exit':
        case 'quit':
          rl.close();
          return;
        case 'reset':
          history.length = 0;
          history.push({ role: 'system', content: SYSTEM_PROMPT });
          console.log('↻ conversation cleared\n');
          continue;
        case 'health': {
          if (!debug) {
            console.log('  (debug only — re-run with FLUX_DEBUG=1)\n');
            continue;
          }
          const h = switcher.getHealth();
          for (const p of h) {
            const cd = p.cooldownUntil > Date.now()
              ? `cooldown ${Math.ceil((p.cooldownUntil - Date.now()) / 1000)}s`
              : 'ok';
            console.log(`  ${p.name.padEnd(22)} fails=${p.consecutiveFailures}  ${cd}`);
          }
          console.log('');
          continue;
        }
        case 'providers':
          if (!debug) {
            console.log('  (debug only — re-run with FLUX_DEBUG=1)\n');
            continue;
          }
          console.log('  ' + names.join(', ') + '\n');
          continue;
        case 'help':
          console.log('  /exit  /reset  /help' + (debug ? '  /health  /providers' : '') + '\n');
          continue;
        default:
          console.log(`unknown command: /${cmd}\n`);
          continue;
      }
    }

    history.push({ role: 'user', content: user });

    const t0 = Date.now();
    try {
      const { content, provider } = await switcher.chat(history);
      const ms = Date.now() - t0;
      history.push({ role: 'assistant', content });
      // Production output: just the answer. No provider/model/timing leak.
      // Debug output (FLUX_DEBUG=1): include routing info for troubleshooting.
      const meta = debug ? ` [${provider} · ${ms}ms]` : '';
      process.stdout.write(`\x1b[32mbot\x1b[0m${meta} › ${content}\n\n`);
    } catch (e: any) {
      // Roll back the user turn so history stays consistent on failure.
      history.pop();
      // Generic message unless operator asked for debug details.
      if (debug) {
        console.error(`\x1b[31m✗ ${e.message}\x1b[0m\n`);
      } else {
        console.error(`\x1b[31m✗ Unable to respond right now. Please try again.\x1b[0m\n`);
      }
    }
  }

  rl.close();
}

main().catch((e) => {
  console.error('chat crashed:', e);
  process.exit(1);
});
