/**
 * Meridian Blue — Parallel Credit Test
 * Sends ALL models simultaneously with big context, tracks credit usage.
 */
import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

const MODELS = [
  // Free
  'cerebras-llama3-8b', 'cf-llama-3.3-70b', 'github-gpt-4o', 'pixtral-12b',
  'gemma-2-2b-it', 'gemma-3-27b-it', 'gemma-3n-e4b-it', 'kimi-k2-instruct',
  'llama-4-maverick-17b-128e-instruct', 'devstral-2-123b-instruct-2512',
  'mistral-large-3-675b-instruct-2512', 'qwen3-coder-480b-a35b-instruct',
  'step-3.5-flash', 'nemotron-mini-4b-instruct', 'phi-4-multimodal-instruct',
  'magistral-small-2506', 'solar-10.7b-instruct',
  // Paid
  'gemini-2.5-flash', 'gemini-2.5-flash-lite',
  'llama-3.1-8b', 'llama-3.3-70b', 'llama-4-scout', 'qwen3-32b',
  'mistral-large', 'mistral-medium', 'mistral-small',
];

const BIG_PROMPT = [
  { role: 'system', content: 'You are a senior software architect. Give detailed, comprehensive technical answers with code examples and explanations.' },
  { role: 'user', content: `Write a complete guide on building a microservices architecture with Node.js. Include:
1. Service discovery and registration patterns
2. API Gateway implementation with rate limiting
3. Inter-service communication (sync vs async)
4. Event-driven architecture with message queues
5. Database per service pattern
6. Circuit breaker and resilience patterns
7. Distributed tracing and observability
8. Authentication and authorization across services
Provide working code examples for each section.` }
];

interface Result {
  model: string;
  status: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsBefore: string;
  creditsAfter: string;
  creditsConsumed: string;
  billingCost: string;
  latencyMs: number;
  cached: string;
}

async function testModel(model: string): Promise<Result> {
  const start = Date.now();
  try {
    const r = await axios.post(API, {
      model,
      messages: BIG_PROMPT,
      max_tokens: 500,
      temperature: 0.7,
    }, {
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      timeout: 120000,
      validateStatus: () => true,
    });

    const ms = Date.now() - start;
    const creditRemain = r.headers['x-meridian-credit-remaining'] || '?';
    const creditLimit = r.headers['x-meridian-credit-limit'] || '?';
    const cached = r.headers['x-meridian-cache'] || 'MISS';
    const usage = r.data?.usage;
    const billing = r.data?.billing;

    if (r.status === 200) {
      return {
        model, status: '✅',
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        creditsBefore: creditLimit,
        creditsAfter: creditRemain,
        creditsConsumed: billing?.cost?.toString() || '0',
        billingCost: `$${billing?.cost || 0}`,
        latencyMs: billing?.latencyMs || ms,
        cached,
      };
    } else if (r.status === 429) {
      return { model, status: '🚫 RATE LIMITED', promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsBefore: '', creditsAfter: creditRemain, creditsConsumed: '0', billingCost: '$0', latencyMs: ms, cached: '' };
    } else {
      return { model, status: `❌ ${r.data?.error?.message?.substring(0, 40) || r.status}`, promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsBefore: '', creditsAfter: creditRemain, creditsConsumed: '0', billingCost: '$0', latencyMs: ms, cached: '' };
    }
  } catch (e: any) {
    return { model, status: `❌ ${e.message.substring(0, 40)}`, promptTokens: 0, completionTokens: 0, totalTokens: 0, creditsBefore: '', creditsAfter: '', creditsConsumed: '0', billingCost: '$0', latencyMs: Date.now() - start, cached: '' };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     MERIDIAN BLUE — PARALLEL CREDIT CONSUMPTION TEST (All models at once!)     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`Sending ${MODELS.length} requests simultaneously | ~500 tok in, 500 tok out each\n`);

  const start = Date.now();
  const results = await Promise.all(MODELS.map(m => testModel(m)));
  const elapsed = Date.now() - start;

  // Print table
  console.log('Model                                  | St | Prompt | Comp | Total | Cost     | Latency  | Credits Left   | Cache');
  console.log('---------------------------------------|----| -------|------|-------|----------|----------|----------------|------');
  for (const r of results) {
    const name = r.model.substring(0, 38).padEnd(38);
    const st = r.status.substring(0, 2).padEnd(2);
    const pt = String(r.promptTokens).padEnd(6);
    const ct = String(r.completionTokens).padEnd(4);
    const tt = String(r.totalTokens).padEnd(5);
    const cost = r.billingCost.padEnd(8);
    const lat = `${r.latencyMs}ms`.padEnd(8);
    const cr = String(r.creditsAfter).padEnd(14);
    console.log(`${name} | ${st} | ${pt} | ${ct} | ${tt} | ${cost} | ${lat} | ${cr} | ${r.cached}`);
  }

  const totalIn = results.reduce((s, r) => s + r.promptTokens, 0);
  const totalOut = results.reduce((s, r) => s + r.completionTokens, 0);
  const succeeded = results.filter(r => r.status === '✅').length;
  const limited = results.filter(r => r.status.includes('RATE')).length;

  console.log(`\n━━━ TOTALS ━━━`);
  console.log(`  Models tested: ${MODELS.length} | Succeeded: ${succeeded} | Rate limited: ${limited}`);
  console.log(`  Total tokens: ${totalIn} in + ${totalOut} out = ${totalIn + totalOut}`);
  console.log(`  Wall time: ${elapsed}ms (all parallel)`);
  console.log(`  Final credits: ${results[results.length - 1]?.creditsAfter}`);
}

main().catch(console.error);
