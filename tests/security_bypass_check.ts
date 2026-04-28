/**
 * Meridian Blue — Security Vulnerability Confirmation
 * Specifically testing "Empty Bearer" bypass across different providers.
 */
import axios from 'axios';

const BASE = 'http://localhost:3000';
const API = `${BASE}/api/v1/chat/completions`;

// Test one model from each major provider/aggregator
const TEST_MODELS = [
  'cerebras-llama3-8b',
  'cf-llama-3.3-70b',
  'github-gpt-4o',
  'pixtral-12b',
  'gemma-2-2b-it',
  'gemini-2.5-flash-lite',
  'llama-3.1-8b',
];

async function testBypass(model: string) {
  try {
    const res = await axios.post(API, {
      model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5
    }, {
      headers: { 
        'Authorization': 'Bearer ', // Empty bearer
        'Content-Type': 'application/json' 
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (res.status === 200) {
      console.log(`🔴 [VULNERABLE] ${model.padEnd(25)}: Status 200 OK (Request bypassed auth)`);
    } else {
      console.log(`✅ [SECURE]     ${model.padEnd(25)}: Status ${res.status} (Auth enforced)`);
    }
  } catch (err: any) {
    console.log(`ℹ️  [ERROR]      ${model.padEnd(25)}: ${err.message}`);
  }
}

async function run() {
  console.log('--- CONFIRMING AUTH BYPASS (EMPTY BEARER) ---');
  console.log(`Target: ${BASE}\n`);
  
  for (const model of TEST_MODELS) {
    await testBypass(model);
  }
}

run();
