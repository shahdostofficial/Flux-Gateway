/**
 * Meridian Blue — Debugging Failures & Advanced Scenarios
 */
import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

async function debugStress() {
  console.log(`\n🔍 [DEBUG] Investigating Stress Test Failures`);
  const r = await axios.post(API, {
    model: 'cerebras-llama3-8b',
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 5
  }, {
    headers: { Authorization: `Bearer ${KEY}` },
    validateStatus: () => true
  });
  console.log(`Current Status: ${r.status}`);
  if (r.status !== 200) console.log(`Error Body:`, JSON.stringify(r.data));
}

async function testPhiVision() {
  console.log(`\n👁️  [SCENARIO 4] Vision Test (phi-4-multimodal-instruct)`);
  try {
    const res = await axios.post(API, {
      model: 'phi-4-multimodal-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image briefly.' },
            { 
              type: 'image_url', 
              image_url: { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gnome-home.svg/1200px-Gnome-home.svg.png' } 
            }
          ]
        }
      ],
      max_tokens: 50
    }, {
      headers: { Authorization: `Bearer ${KEY}` },
      validateStatus: () => true
    });
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${JSON.stringify(res.data.choices?.[0]?.message?.content || res.data)}`);
  } catch (err: any) {
    console.log(`❌ Failed: ${err.message}`);
  }
}

async function testToolUse() {
  console.log(`\n🛠️  [SCENARIO 5] Tool Use / Function Calling (github-gpt-4o)`);
  try {
    const res = await axios.post(API, {
      model: 'github-gpt-4o',
      messages: [{ role: 'user', content: 'What is the weather in London?' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the current weather in a location',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' }
              },
              required: ['location']
            }
          }
        }
      ],
      tool_choice: 'auto'
    }, {
      headers: { Authorization: `Bearer ${KEY}` },
      validateStatus: () => true
    });
    console.log(`Status: ${res.status}`);
    if (res.data.choices?.[0]?.message?.tool_calls) {
      console.log(`✅ Tool Call Detected: ${JSON.stringify(res.data.choices[0].message.tool_calls[0].function)}`);
    } else {
      console.log(`ℹ️ No tool call, but response: ${res.data.choices?.[0]?.message?.content}`);
    }
  } catch (err: any) {
    console.log(`❌ Tool Use Failed: ${err.message}`);
  }
}

async function run() {
  await debugStress();
  await testPhiVision();
  await testToolUse();
}

run();
