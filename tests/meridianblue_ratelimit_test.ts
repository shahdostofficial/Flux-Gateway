/**
 * Meridian Blue — Rate Limit Test
 * Tests 200 request limit per model on free tier
 */
import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

// Test these free models
const TEST_MODELS = [
  'cerebras-llama3-8b',
  'cf-llama-3.3-70b',
  'gemma-2-2b-it',
  'github-gpt-4o',
  'kimi-k2-instruct',
];

async function sendRequest(model: string): Promise<{ status: number; error?: string }> {
  try {
    const r = await axios.post(API, {
      model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1,
    }, {
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });
    return { status: r.status, error: r.data?.error?.message };
  } catch (e: any) {
    return { status: 0, error: e.message };
  }
}

async function testModelLimit(model: string) {
  console.log(`\n━━━ ${model} ━━━`);
  let success = 0, rateLimited = 0, errors = 0;
  let limitHitAt = -1;

  // Send requests in batches of 10 for speed
  for (let batch = 0; batch < 21; batch++) { // 21 batches x 10 = 210 (to go past 200)
    const batchSize = 10;
    const promises = Array.from({ length: batchSize }, () => sendRequest(model));
    const results = await Promise.all(promises);

    for (const r of results) {
      if (r.status === 200) {
        success++;
      } else if (r.status === 429) {
        rateLimited++;
        if (limitHitAt === -1) limitHitAt = success + 1;
      } else {
        errors++;
        if (limitHitAt === -1 && r.error?.toLowerCase().includes('limit')) {
          limitHitAt = success + 1;
        }
      }
    }

    const total = (batch + 1) * batchSize;
    process.stdout.write(`  Sent: ${total} | ✅ ${success} | 🚫 ${rateLimited} | ❌ ${errors}\r`);

    // Stop early if rate limited
    if (rateLimited >= 5) {
      console.log(`\n  ⛔ Rate limited after ${success} successful requests`);
      break;
    }
  }

  console.log(`\n  📊 Result: ${success} successful, ${rateLimited} rate-limited, ${errors} errors`);
  if (limitHitAt > 0) {
    console.log(`  🔒 Limit hit at request #${limitHitAt}`);
  } else if (success >= 200) {
    console.log(`  ✅ 200+ requests succeeded — no per-model limit found!`);
  }
  
  return { model, success, rateLimited, errors, limitHitAt };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MERIDIAN BLUE — RATE LIMIT TEST (200 req check)        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`API: ${BASE}`);

  const results = [];
  for (const model of TEST_MODELS) {
    const r = await testModelLimit(model);
    results.push(r);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nModel                          | Success | Limited | Limit At');
  console.log('-------------------------------|---------|---------|--------');
  for (const r of results) {
    const name = r.model.padEnd(30);
    console.log(`${name} | ${String(r.success).padEnd(7)} | ${String(r.rateLimited).padEnd(7)} | ${r.limitHitAt > 0 ? '#' + r.limitHitAt : 'None'}`);
  }
}

main().catch(console.error);
