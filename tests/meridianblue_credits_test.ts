/**
 * Meridian Blue — Credit Consumption Test
 * Sends bigger context to each model and tracks credit usage via headers.
 */
import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

const MODELS = [
  'cerebras-llama3-8b',
  'cerebras-qwen3-235b',
  'cf-llama-3.3-70b',
  'github-gpt-4o',
  'pixtral-12b',
  'gemma-2-2b-it',
  'gemma-3-27b-it',
  'gemma-3n-e4b-it',
  'kimi-k2-instruct',
  'llama-4-maverick-17b-128e-instruct',
  'mistral-large-3-675b-instruct-2512',
  'qwen3-coder-480b-a35b-instruct',
  'step-3.5-flash',
  'devstral-2-123b-instruct-2512',
  // Paid
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'llama-3.1-8b',
  'llama-3.3-70b',
  'llama-4-scout',
  'qwen3-32b',
  'mistral-large',
  'mistral-medium',
  'mistral-small',
];

// Big context prompt (~500 tokens input, request 200 tokens output)
const BIG_PROMPT = [
  { role: 'system', content: 'You are a senior software engineer. Provide detailed technical answers with code examples. Be thorough and comprehensive in your explanations.' },
  { role: 'user', content: `Explain the difference between REST and GraphQL APIs. Cover the following points in detail:
1. Architecture and design philosophy
2. Data fetching patterns (over-fetching, under-fetching)
3. Type system and schema definition
4. Real-time capabilities (subscriptions vs webhooks)
5. Caching strategies
6. Error handling approaches
7. When to choose one over the other
Please provide code examples for each point.` }
];

async function testModel(model: string, prevCredits: number) {
  try {
    const r = await axios.post(API, {
      model,
      messages: BIG_PROMPT,
      max_tokens: 200,
      temperature: 0.7,
    }, {
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: () => true,
    });

    const creditLimit = r.headers['x-meridian-credit-limit'];
    const creditRemain = r.headers['x-meridian-credit-remaining'];
    const creditUsage = r.headers['x-meridian-credit-usage-percent'];
    const rateRemain = r.headers['x-ratelimit-remaining'];
    const cached = r.headers['x-meridian-cache'];

    const remain = parseFloat(creditRemain) || 0;
    const consumed = prevCredits > 0 ? (prevCredits - remain).toFixed(2) : '—';

    const usage = r.data?.usage;
    const billing = r.data?.billing;
    const promptTok = usage?.prompt_tokens || 0;
    const compTok = usage?.completion_tokens || 0;
    const totalTok = usage?.total_tokens || 0;

    if (r.status === 200) {
      console.log(`  ✅ ${model}`);
      console.log(`     Tokens: ${promptTok} in + ${compTok} out = ${totalTok} total`);
      console.log(`     Credits consumed: ${consumed} | Remaining: ${creditRemain} / ${creditLimit} (${creditUsage}%)`);
      console.log(`     Rate limit left: ${rateRemain}/min | Cache: ${cached || 'MISS'}`);
      if (billing) console.log(`     Billing cost: $${billing.cost} | Latency: ${billing.latencyMs}ms`);
    } else if (r.status === 429) {
      console.log(`  🚫 ${model} — RATE LIMITED (waiting...)`);
      return { remain: prevCredits, limited: true };
    } else {
      console.log(`  ❌ ${model} — ${r.data?.error?.message?.substring(0, 60)}`);
    }

    return { remain, limited: false };
  } catch (e: any) {
    console.log(`  ❌ ${model} — ${e.message}`);
    return { remain: prevCredits, limited: false };
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MERIDIAN BLUE — CREDIT CONSUMPTION TEST                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Prompt: ~500 tokens input, 200 tokens output per model\n`);

  let prevCredits = 0;
  let count = 0;

  for (const model of MODELS) {
    count++;
    // Respect 60/min rate limit — pause every 8 requests
    if (count > 1 && count % 8 === 0) {
      console.log(`\n  ⏳ Pausing 15s to avoid rate limit...\n`);
      await sleep(15000);
    }

    const result = await testModel(model, prevCredits);
    if (result.limited) {
      console.log(`  ⏳ Waiting 60s for rate limit reset...`);
      await sleep(60000);
      const retry = await testModel(model, prevCredits);
      prevCredits = retry.remain;
    } else {
      prevCredits = result.remain;
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Final credits remaining: ${prevCredits}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
