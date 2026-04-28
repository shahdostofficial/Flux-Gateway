/**
 * Meridian Blue — Model Testing Script
 * Tests all active models from the Meridian Blue gateway one by one.
 */
import 'dotenv/config';
import axios from 'axios';

const BASE_URL = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.MERIDIAN_BLUE_API_KEY;

if (!API_KEY) {
  console.error('❌ MERIDIAN_BLUE_API_KEY not found in .env');
  process.exit(1);
}

// All active models from Meridian Blue catalog
const FREE_MODELS = [
  // Cerebras
  'cerebras-llama3-8b',
  'cerebras-qwen3-235b',
  // Cloudflare
  'cf-llama-3.3-70b',
  // GitHub
  'github-gpt-4o',
  // Mistral (free)
  'pixtral-12b',
  // NVIDIA
  'devstral-2-123b-instruct-2512',
  'gemma-2-2b-it',
  'gemma-3-27b-it',
  'gemma-3n-e2b-it',
  'gemma-3n-e4b-it',
  'gliner-pii',
  'kimi-k2-instruct',
  'kimi-k2-instruct-0905',
  'llama-3.1-nemotron-safety-guard-8b-v3',
  'llama-4-maverick-17b-128e-instruct',
  'llama-guard-4-12b',
  'magistral-small-2506',
  'mistral-large-3-675b-instruct-2512',
  'mistral-medium-3-instruct',
  'nemotron-3-content-safety',
  'nemotron-content-safety-reasoning-4b',
  'nemotron-mini-4b-instruct',
  'nv-embed-v1',
  'phi-4-multimodal-instruct',
  'qwen3-coder-480b-a35b-instruct',
  'solar-10.7b-instruct',
  'step-3.5-flash',
];

const PAID_MODELS = [
  // Gemini
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  // Groq
  'llama-3.1-8b',
  'llama-3.3-70b',
  'llama-4-scout',
  'qwen3-32b',
  // Mistral (paid)
  'magistral-small',
  'mistral-embed',
  'mistral-large',
  'mistral-medium',
  'mistral-small',
];

interface TestResult {
  model: string;
  tier: string;
  status: '✅ PASS' | '❌ FAIL';
  response?: string;
  error?: string;
  timeMs: number;
}

async function testModel(model: string, tier: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await axios.post(
      `${BASE_URL}/api/v1/chat/completions`,
      {
        model,
        messages: [
          { role: 'user', content: 'Say "hello" in one word only.' }
        ],
        temperature: 0.1,
        max_tokens: 20,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = res.data?.choices?.[0]?.message?.content || '';
    return {
      model,
      tier,
      status: '✅ PASS',
      response: content.substring(0, 60),
      timeMs: Date.now() - start,
    };
  } catch (err: any) {
    const errMsg = err?.response?.data?.error?.message
      || err?.response?.statusText
      || err?.message
      || 'Unknown error';
    return {
      model,
      tier,
      status: '❌ FAIL',
      error: errMsg.substring(0, 80),
      timeMs: Date.now() - start,
    };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          MERIDIAN BLUE — MODEL TESTING                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`API Key:  ${API_KEY!.substring(0, 12)}...`);
  console.log(`\nTesting ${FREE_MODELS.length} free + ${PAID_MODELS.length} paid = ${FREE_MODELS.length + PAID_MODELS.length} models\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  // Test FREE models
  console.log('━━━ FREE MODELS ━━━');
  for (const model of FREE_MODELS) {
    process.stdout.write(`  Testing ${model}... `);
    const result = await testModel(model, 'Free');
    results.push(result);
    if (result.status === '✅ PASS') {
      passed++;
      console.log(`${result.status} (${result.timeMs}ms) → "${result.response}"`);
    } else {
      failed++;
      console.log(`${result.status} (${result.timeMs}ms) → ${result.error}`);
    }
  }

  // Test PAID models
  console.log('\n━━━ PAID MODELS ━━━');
  for (const model of PAID_MODELS) {
    process.stdout.write(`  Testing ${model}... `);
    const result = await testModel(model, 'Paid');
    results.push(result);
    if (result.status === '✅ PASS') {
      passed++;
      console.log(`${result.status} (${result.timeMs}ms) → "${result.response}"`);
    } else {
      failed++;
      console.log(`${result.status} (${result.timeMs}ms) → ${result.error}`);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\nFailed models:');
    results.filter(r => r.status === '❌ FAIL').forEach(r => {
      console.log(`  ❌ [${r.tier}] ${r.model} → ${r.error}`);
    });
  }
}

main().catch(console.error);
