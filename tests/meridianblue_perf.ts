/**
 * Meridian Blue — Head-to-Head & Context Test
 */
import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

async function testContext() {
  console.log(`\n📚 [SCENARIO 6] Long Context Test (cerebras-llama3-8b)`);
  const longText = 'This is a test of the long context capabilities. '.repeat(200); // ~2000 words
  try {
    const res = await axios.post(API, {
      model: 'cerebras-llama3-8b',
      messages: [{ role: 'user', content: longText + '\n\nSummarize the above in one sentence.' }],
      max_tokens: 50
    }, {
      headers: { Authorization: `Bearer ${KEY}` }
    });
    console.log(`✅ Success! Response: ${res.data.choices[0].message.content}`);
  } catch (err: any) {
    console.log(`❌ Context Test Failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

async function headToHead() {
  console.log(`\n🏁 [SCENARIO 7] Head-to-Head Latency (100 token response)`);
  const models = ['github-gpt-4o', 'gemini-2.5-flash-lite', 'llama-3.1-8b', 'cerebras-llama3-8b'];
  
  for (const model of models) {
    const start = Date.now();
    try {
      const res = await axios.post(API, {
        model,
        messages: [{ role: 'user', content: 'Write a short poem about the ocean.' }],
        max_tokens: 100
      }, {
        headers: { Authorization: `Bearer ${KEY}` }
      });
      const duration = Date.now() - start;
      console.log(`  ⏱️  ${model.padEnd(25)}: ${duration}ms | Tokens: ${res.data.usage?.total_tokens}`);
    } catch (err: any) {
      console.log(`  ❌ ${model.padEnd(25)}: Failed (${err.message})`);
    }
  }
}

async function run() {
  await testContext();
  await headToHead();
}

run();
