/// <reference types="node" />
/**
 * Live probe: tries every provider whose API key is set in .env,
 * one at a time, and reports which ones actually work.
 * Does NOT print your API keys.
 */
import * as dotenv from 'dotenv';
import {
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

type Entry = { label: string; make: () => Provider | null };

const entries: Entry[] = [
  { label: 'OpenRouter',   make: () => { const k = realEnv('OPENROUTER_API_KEY');    return k ? new OpenRouterProvider(k) : null; } },
  { label: 'Groq',         make: () => { const k = realEnv('GROQ_API_KEY');          return k ? new GroqProvider(k) : null; } },
  { label: 'TogetherAI',   make: () => { const k = realEnv('TOGETHER_API_KEY');      return k ? new TogetherProvider(k) : null; } },
  {
    label: 'MeridianBlue',
    make: () => {
      const k = realEnv('MERIDIAN_BLUE_API_KEY');
      if (!k) return null;
      const base = realEnv('MERIDIAN_BLUE_BASE_URL');
      return base ? new MeridianBlueProvider(k, base) : new MeridianBlueProvider(k);
    },
  },
  { label: 'DeepSeek',     make: () => { const k = realEnv('DEEPSEEK_API_KEY');      return k ? new DeepSeekProvider(k) : null; } },
  { label: 'HuggingFace',  make: () => { const k = realEnv('HUGGINGFACE_API_KEY');   return k ? new HuggingFaceProvider(k) : null; } },
  { label: 'ShuttleAI',    make: () => { const k = realEnv('SHUTTLEAI_API_KEY');     return k ? new ShuttleAIProvider(k) : null; } },
  { label: 'DeepInfra',    make: () => { const k = realEnv('DEEPINFRA_API_KEY');     return k ? new DeepInfraProvider(k) : null; } },
  { label: 'Cerebras',     make: () => { const k = realEnv('CEREBRAS_API_KEY');      return k ? new CerebrasProvider(k) : null; } },
  { label: 'SambaNova',    make: () => { const k = realEnv('SAMBANOVA_API_KEY');     return k ? new SambaNovaProvider(k) : null; } },
  {
    label: 'CloudflareWorkersAI',
    make: () => {
      const acc = realEnv('CLOUDFLARE_ACCOUNT_ID');
      const key = realEnv('CLOUDFLARE_API_KEY');
      return acc && key ? new CloudflareWorkersAIProvider(acc, key) : null;
    },
  },
  { label: 'Pollinations (no key)', make: () => new PollinationsProvider() },
];

const PROMPT = [{ role: 'user' as const, content: 'Reply with exactly one word: PONG' }];

function redact(msg: string): string {
  // Strip anything that looks like a bearer key leaking into an error body.
  return msg
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer ***')
    .replace(/sk-[A-Za-z0-9_\-]+/g, 'sk-***')
    .replace(/gsk_[A-Za-z0-9_\-]+/g, 'gsk_***')
    .slice(0, 220);
}

async function probe(label: string, p: Provider): Promise<{ ok: boolean; info: string; ms: number }> {
  const t0 = Date.now();
  try {
    const content = await p.complete(PROMPT, {});
    const ms = Date.now() - t0;
    const preview = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    return { ok: true, info: `"${preview}"`, ms };
  } catch (e: any) {
    const ms = Date.now() - t0;
    return { ok: false, info: redact(e?.message ?? String(e)), ms };
  }
}

async function main() {
  console.log('🔎 FluxGateway live provider probe\n');

  const configured: { label: string; provider: Provider }[] = [];
  const skipped: string[] = [];

  for (const e of entries) {
    const p = e.make();
    if (p) configured.push({ label: e.label, provider: p });
    else skipped.push(e.label);
  }

  console.log(`Configured providers: ${configured.length}`);
  console.log(`Skipped (no key set): ${skipped.length === 0 ? '—' : skipped.join(', ')}\n`);

  const results: { label: string; ok: boolean; info: string; ms: number }[] = [];
  for (const { label, provider } of configured) {
    process.stdout.write(`  • ${label.padEnd(22)} … `);
    const r = await probe(label, provider);
    results.push({ label, ...r });
    const tag = r.ok ? '✅ OK' : '❌ FAIL';
    console.log(`${tag}  (${r.ms}ms)  ${r.info}`);
  }

  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);

  console.log('\n──────── Summary ────────');
  console.log(`✅ Working : ${ok.length}  [${ok.map((r) => r.label).join(', ') || '—'}]`);
  console.log(`❌ Failing : ${bad.length}  [${bad.map((r) => r.label).join(', ') || '—'}]`);
  console.log(`⏭  Skipped : ${skipped.length}  [${skipped.join(', ') || '—'}]`);
}

main().catch((e) => {
  console.error('Probe crashed:', e);
  process.exit(1);
});
