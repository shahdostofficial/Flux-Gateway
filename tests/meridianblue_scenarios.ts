/**
 * Meridian Blue — Advanced Scenario Testing (OpenRouter Style)
 * 1. Streaming (SSE)
 * 2. Vision (Multimodal)
 * 3. Rapid Fire Stress (Rate Limit Edge)
 * 4. Model Metadata Accuracy
 */
import 'dotenv/config';
import axios from 'axios';
import EventSource from 'eventsource';

const BASE = process.env.MERIDIAN_BLUE_BASE_URL || 'http://localhost:3000';
const KEY = process.env.MERIDIAN_BLUE_API_KEY!;
const API = `${BASE}/api/v1/chat/completions`;

async function testStreaming(model: string) {
  console.log(`\n🌊 [SCENARIO 1] Streaming Test (${model})`);
  return new Promise((resolve) => {
    let text = '';
    const start = Date.now();
    
    // We use a POST request but expect a stream
    axios({
      method: 'post',
      url: API,
      data: {
        model,
        messages: [{ role: 'user', content: 'Count from 1 to 5 slowly with words.' }],
        stream: true,
        max_tokens: 50
      },
      headers: { 
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      responseType: 'stream'
    }).then(response => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const json = JSON.parse(dataStr);
              const delta = json.choices[0]?.delta?.content || '';
              text += delta;
              process.stdout.write(delta);
            } catch (e) {}
          }
        }
      });

      response.data.on('end', () => {
        const duration = Date.now() - start;
        console.log(`\n✅ Stream Finished in ${duration}ms. Output: "${text.trim()}"`);
        resolve(true);
      });
    }).catch(err => {
      console.log(`❌ Streaming Failed: ${err.message}`);
      resolve(false);
    });
  });
}

async function testVision() {
  console.log(`\n👁️  [SCENARIO 2] Vision Test (pixtral-12b)`);
  try {
    const res = await axios.post(API, {
      model: 'pixtral-12b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { 
              type: 'image_url', 
              image_url: { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gnome-home.svg/1200px-Gnome-home.svg.png' } 
            }
          ]
        }
      ],
      max_tokens: 50
    }, {
      headers: { Authorization: `Bearer ${KEY}` }
    });
    console.log(`✅ Vision Response: ${res.data.choices[0].message.content}`);
  } catch (err: any) {
    console.log(`❌ Vision Failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

async function testStress() {
  console.log(`\n🚀 [SCENARIO 3] Rapid Fire Stress (50 Requests in 5 seconds)`);
  const start = Date.now();
  const promises = [];
  
  for (let i = 0; i < 50; i++) {
    promises.push(
      axios.post(API, {
        model: 'cerebras-llama3-8b',
        messages: [{ role: 'user', content: `Quick check ${i}` }],
        max_tokens: 5
      }, {
        headers: { Authorization: `Bearer ${KEY}` },
        validateStatus: () => true
      })
    );
    // Tiny delay to not choke the network stack
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 100));
  }

  const results = await Promise.all(promises);
  const success = results.filter(r => r.status === 200).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  const duration = Date.now() - start;

  console.log(`🏁 Stress Completed in ${duration}ms`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   🚫 429 Rate Limit: ${rateLimited}`);
  console.log(`   ❌ Other Errors: ${50 - success - rateLimited}`);
}

async function run() {
  console.log('--- MERIDIAN BLUE GATEWAY SCENARIO SUITE ---');
  await testStreaming('cerebras-llama3-8b');
  await testVision();
  await testStress();
  console.log('\n--- ALL SCENARIOS COMPLETE ---');
}

run();
