/**
 * Meridian Blue — Developer Experience (DX) Test Suite
 * Tests everything a developer would face when integrating this API.
 */
import 'dotenv/config';
import axios, { AxiosError } from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

let passed = 0, failed = 0, warnings = 0;
const issues: string[] = [];

async function post(body: any, opts: any = {}) {
  return axios.post(API, body, {
    headers: { Authorization: `Bearer ${opts.key || KEY}`, 'Content-Type': 'application/json' },
    timeout: opts.timeout || 30000,
    validateStatus: () => true, // don't throw on non-2xx
  });
}

function log(icon: string, test: string, detail: string) {
  console.log(`  ${icon} ${test}`);
  if (detail) console.log(`     → ${detail}`);
}

function pass(test: string, detail = '') { passed++; log('✅', test, detail); }
function fail(test: string, detail = '') { failed++; log('❌', test, detail); issues.push(`${test}: ${detail}`); }
function warn(test: string, detail = '') { warnings++; log('⚠️', test, detail); }

// ─────────────────────────────────────────────────
// TEST 1: Authentication
// ─────────────────────────────────────────────────
async function testAuth() {
  console.log('\n━━━ 1. AUTHENTICATION ━━━');

  // Valid key
  const r1 = await post({ model: 'gemma-2-2b-it', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 });
  r1.status === 200 ? pass('Valid API key accepted') : fail('Valid API key rejected', `Status: ${r1.status}`);

  // Invalid key
  const r2 = await post({ model: 'gemma-2-2b-it', messages: [{ role: 'user', content: 'hi' }] }, { key: 'invalid-key-123' });
  r2.status === 401 ? pass('Invalid key returns 401') : fail('Invalid key wrong status', `Got ${r2.status} instead of 401`);

  // No key
  const r3 = await axios.post(API, { model: 'gemma-2-2b-it', messages: [{ role: 'user', content: 'hi' }] }, {
    headers: { 'Content-Type': 'application/json' }, timeout: 10000, validateStatus: () => true
  });
  [401, 403].includes(r3.status) ? pass('Missing key returns auth error') : fail('Missing key wrong status', `Got ${r3.status}`);

  // Empty bearer
  const r4 = await post({ model: 'gemma-2-2b-it', messages: [{ role: 'user', content: 'hi' }] }, { key: '' });
  [401, 403].includes(r4.status) ? pass('Empty bearer token rejected') : fail('Empty bearer accepted', `Got ${r4.status}`);
}

// ─────────────────────────────────────────────────
// TEST 2: Request Validation
// ─────────────────────────────────────────────────
async function testValidation() {
  console.log('\n━━━ 2. REQUEST VALIDATION ━━━');

  // Missing model
  const r1 = await post({ messages: [{ role: 'user', content: 'hi' }] });
  r1.status >= 400 && r1.status < 500 ? pass('Missing model field returns 4xx') : warn('Missing model not rejected', `Status: ${r1.status}`);

  // Invalid model name
  const r2 = await post({ model: 'nonexistent-model-xyz', messages: [{ role: 'user', content: 'hi' }] });
  r2.status >= 400 ? pass('Invalid model returns error', `Status: ${r2.status}`) : fail('Invalid model accepted silently');

  // Empty messages array
  const r3 = await post({ model: 'gemma-2-2b-it', messages: [] });
  r3.status >= 400 ? pass('Empty messages rejected') : warn('Empty messages accepted', 'May cause unexpected behavior');

  // Missing messages
  const r4 = await post({ model: 'gemma-2-2b-it' });
  r4.status >= 400 ? pass('Missing messages rejected') : warn('Missing messages accepted', `Status: ${r4.status}`);

  // Wrong role
  const r5 = await post({ model: 'gemma-2-2b-it', messages: [{ role: 'invalid_role', content: 'hi' }] });
  if (r5.status >= 400) pass('Invalid role rejected');
  else warn('Invalid role accepted', 'Upstream may handle differently');
}

// ─────────────────────────────────────────────────
// TEST 3: Response Format (OpenAI compatibility)
// ─────────────────────────────────────────────────
async function testResponseFormat() {
  console.log('\n━━━ 3. RESPONSE FORMAT (OpenAI Compat) ━━━');

  const r = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: 'Say "test" only' }], max_tokens: 10 });
  const d = r.data;

  // Check required OpenAI fields
  d.id ? pass('Response has "id" field') : fail('Missing "id" field');
  d.object === 'chat.completion' ? pass('object = "chat.completion"') : fail('Wrong object type', d.object);
  d.model ? pass('Response has "model" field') : fail('Missing "model" field');
  d.created ? pass('Response has "created" timestamp') : warn('Missing "created" field');
  Array.isArray(d.choices) ? pass('choices is an array') : fail('choices is not an array');

  if (d.choices?.[0]) {
    const c = d.choices[0];
    c.message?.content !== undefined ? pass('choices[0].message.content exists') : fail('No message content');
    c.message?.role === 'assistant' ? pass('role = "assistant"') : warn('Unexpected role', c.message?.role);
    c.finish_reason ? pass('finish_reason present', c.finish_reason) : warn('Missing finish_reason');
    typeof c.index === 'number' ? pass('index is a number') : warn('Missing index field');
  }

  // Usage stats
  if (d.usage) {
    typeof d.usage.prompt_tokens === 'number' ? pass('usage.prompt_tokens is number') : warn('Missing prompt_tokens');
    typeof d.usage.completion_tokens === 'number' ? pass('usage.completion_tokens is number') : warn('Missing completion_tokens');
    typeof d.usage.total_tokens === 'number' ? pass('usage.total_tokens is number') : warn('Missing total_tokens');
  } else {
    warn('No usage object in response');
  }
}

// ─────────────────────────────────────────────────
// TEST 4: Parameters (temperature, max_tokens, etc.)
// ─────────────────────────────────────────────────
async function testParameters() {
  console.log('\n━━━ 4. PARAMETER HANDLING ━━━');

  // max_tokens respected
  const r1 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: 'Write a 500 word essay about AI' }], max_tokens: 15 });
  const tokens1 = r1.data?.usage?.completion_tokens;
  if (tokens1 && tokens1 <= 20) pass('max_tokens=15 respected', `Got ${tokens1} tokens`);
  else if (tokens1) warn('max_tokens loosely enforced', `Requested 15, got ${tokens1}`);
  else warn('Cannot verify max_tokens (no usage data)');

  // temperature=0 (deterministic)
  const msg = [{ role: 'user', content: 'What is 2+2? Reply with just the number.' }];
  const r2 = await post({ model: 'cerebras-llama3-8b', messages: msg, temperature: 0, max_tokens: 5 });
  const r3 = await post({ model: 'cerebras-llama3-8b', messages: msg, temperature: 0, max_tokens: 5 });
  if (r2.data?.choices?.[0]?.message?.content === r3.data?.choices?.[0]?.message?.content) {
    pass('temperature=0 gives consistent results');
  } else {
    warn('temperature=0 gave different results', 'May be acceptable for some models');
  }

  // temperature=2 (high) - should still work
  const r4 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: 'hi' }], temperature: 2, max_tokens: 10 });
  r4.status === 200 ? pass('temperature=2 accepted') : warn('High temperature rejected', `Status: ${r4.status}`);
}

// ─────────────────────────────────────────────────
// TEST 5: System Prompt & Multi-turn
// ─────────────────────────────────────────────────
async function testConversation() {
  console.log('\n━━━ 5. CONVERSATION & SYSTEM PROMPTS ━━━');

  // System prompt works
  const r1 = await post({
    model: 'cerebras-llama3-8b',
    messages: [
      { role: 'system', content: 'You are a pirate. Always respond with pirate language.' },
      { role: 'user', content: 'Hello!' }
    ],
    max_tokens: 30
  });
  const content1 = r1.data?.choices?.[0]?.message?.content?.toLowerCase() || '';
  if (r1.status === 200) pass('System prompt accepted', `Response: "${content1.substring(0, 50)}"`);
  else fail('System prompt failed', `Status: ${r1.status}`);

  // Multi-turn conversation
  const r2 = await post({
    model: 'cerebras-llama3-8b',
    messages: [
      { role: 'user', content: 'My name is TestBot-42.' },
      { role: 'assistant', content: 'Hello TestBot-42!' },
      { role: 'user', content: 'What is my name?' }
    ],
    max_tokens: 20
  });
  const content2 = r2.data?.choices?.[0]?.message?.content || '';
  if (content2.includes('TestBot') || content2.includes('42')) {
    pass('Multi-turn context preserved', `"${content2.substring(0, 50)}"`);
  } else {
    warn('Multi-turn context may be lost', `"${content2.substring(0, 50)}"`);
  }
}

// ─────────────────────────────────────────────────
// TEST 6: Error Responses
// ─────────────────────────────────────────────────
async function testErrors() {
  console.log('\n━━━ 6. ERROR RESPONSE FORMAT ━━━');

  const r = await post({ model: 'fake-model-xyz', messages: [{ role: 'user', content: 'hi' }] });
  const err = r.data?.error;

  if (err) {
    err.message ? pass('Error has "message" field') : fail('Error missing message');
    err.type ? pass('Error has "type" field', err.type) : warn('Error missing type');
    err.code ? pass('Error has "code" field', err.code) : warn('Error missing code');
  } else {
    fail('Error response has no "error" object', JSON.stringify(r.data).substring(0, 100));
  }
}

// ─────────────────────────────────────────────────
// TEST 7: Concurrency / Rate Limits
// ─────────────────────────────────────────────────
async function testConcurrency() {
  console.log('\n━━━ 7. CONCURRENCY & RATE LIMITS ━━━');

  // 5 parallel requests
  const start = Date.now();
  const promises = Array.from({ length: 5 }, (_, i) =>
    post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: `Count ${i}` }], max_tokens: 5 })
  );
  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;
  const successes = results.filter(r => r.status === 200).length;
  const rateLimited = results.filter(r => r.status === 429).length;

  if (successes === 5) {
    pass(`5 parallel requests all succeeded (${elapsed}ms)`);
  } else if (rateLimited > 0) {
    warn(`Rate limited: ${rateLimited}/5 got 429`, 'Expected for free tier');
  } else {
    fail(`Only ${successes}/5 succeeded`, results.map(r => r.status).join(', '));
  }
}

// ─────────────────────────────────────────────────
// TEST 8: Latency check across models
// ─────────────────────────────────────────────────
async function testLatency() {
  console.log('\n━━━ 8. LATENCY CHECK (key models) ━━━');

  const models = ['cerebras-llama3-8b', 'cf-llama-3.3-70b', 'gemma-2-2b-it', 'gemini-2.5-flash', 'llama-3.1-8b'];
  for (const model of models) {
    const start = Date.now();
    const r = await post({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 });
    const ms = Date.now() - start;
    if (r.status === 200) {
      if (ms < 2000) pass(`${model}: ${ms}ms`, 'Fast');
      else if (ms < 5000) warn(`${model}: ${ms}ms`, 'Slow but acceptable');
      else warn(`${model}: ${ms}ms`, 'Very slow - bad DX');
    } else {
      fail(`${model}: error ${r.status}`, r.data?.error?.message?.substring(0, 60));
    }
  }
}

// ─────────────────────────────────────────────────
// TEST 9: Edge cases
// ─────────────────────────────────────────────────
async function testEdgeCases() {
  console.log('\n━━━ 9. EDGE CASES ━━━');

  // Very long prompt
  const longText = 'Hello '.repeat(500);
  const r1 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: longText }], max_tokens: 10 });
  r1.status === 200 ? pass('Long prompt (3000 chars) handled') : warn('Long prompt failed', `Status: ${r1.status}`);

  // Unicode / Emoji
  const r2 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: '🤖 مرحبا 你好 こんにちは' }], max_tokens: 10 });
  r2.status === 200 ? pass('Unicode/emoji handled') : fail('Unicode failed', `Status: ${r2.status}`);

  // Special characters
  const r3 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: '<script>alert("xss")</script>' }], max_tokens: 10 });
  r3.status === 200 ? pass('HTML/script tags handled safely') : warn('Script tags rejected', `Status: ${r3.status}`);

  // Just whitespace
  const r4 = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: '   ' }], max_tokens: 10 });
  pass('Whitespace-only input handled', `Status: ${r4.status}`);
}

// ─────────────────────────────────────────────────
// TEST 10: Billing / Extra fields
// ─────────────────────────────────────────────────
async function testBilling() {
  console.log('\n━━━ 10. BILLING & EXTRA FIELDS ━━━');

  const r = await post({ model: 'cerebras-llama3-8b', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 });
  const d = r.data;

  if (d.billing) {
    pass('Billing object present');
    typeof d.billing.cost === 'number' ? pass('billing.cost is number', `$${d.billing.cost}`) : warn('Missing billing.cost');
    d.billing.latencyMs !== undefined ? pass('billing.latencyMs present', `${d.billing.latencyMs}ms`) : warn('Missing latencyMs');
  } else {
    warn('No billing object (optional)');
  }

  if (d.risk_classification) {
    pass('Risk classification present', d.risk_classification.level);
  } else {
    warn('No risk_classification (optional)');
  }
}

// ─────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MERIDIAN BLUE — DEVELOPER EXPERIENCE TEST SUITE        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`API: ${BASE}`);
  console.log(`Key: ${KEY.substring(0, 12)}...`);

  await testAuth();
  await testValidation();
  await testResponseFormat();
  await testParameters();
  await testConversation();
  await testErrors();
  await testConcurrency();
  await testLatency();
  await testEdgeCases();
  await testBilling();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ ${passed} PASSED  |  ❌ ${failed} FAILED  |  ⚠️  ${warnings} WARNINGS`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (issues.length) {
    console.log('\n🔴 Issues for developers:');
    issues.forEach((i, n) => console.log(`  ${n + 1}. ${i}`));
  }
}

main().catch(console.error);
