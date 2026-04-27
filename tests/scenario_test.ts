import 'dotenv/config';
import { 
  ChatSwitcher, 
  SessionManager, 
  InMemoryStore, 
  BaseProvider, 
  Message, 
  ChatOptions, 
  ModelInfo, 
  GatewayEvent,
  Capability
} from '../src/index.js';

/**
 * Mock Providers to test logic without API calls / Costs
 */

class MockTextProvider extends BaseProvider {
  readonly name = 'MockTextOnly';
  protected apiKey = 'none';
  protected apiUrl = 'http://localhost';
  
  listModels(): ModelInfo[] { 
    return [{ id: 'text-model', capabilities: ['text'] }]; 
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    const lastMsg = messages[messages.length - 1];
    const textMsg = Array.isArray(lastMsg.content) 
      ? lastMsg.content.find((c: any) => c.type === 'text')?.text 
      : lastMsg.content;
    
    // Simulate knowing history
    if (messages.some(m => typeof m.content === 'string' && m.content.includes('8888'))) {
      return `I remember the secret 8888. Current model: ${this.name}`;
    }
    if (messages.some(m => typeof m.content === 'string' && m.content.includes('BOB-99'))) {
      return `I remember the secret BOB-99. Current model: ${this.name}`;
    }

    return `[TextOnly] Echo: ${textMsg}`;
  }
}

class MockVisionProvider extends BaseProvider {
  readonly name = 'MockVision';
  protected apiKey = 'none';
  protected apiUrl = 'http://localhost';

  listModels(): ModelInfo[] { 
    return [{ id: 'vision-model', capabilities: ['text' as Capability, 'image_input' as Capability] }]; 
  }

  async complete(messages: Message[], options: ChatOptions): Promise<string> {
    const lastMsg = messages[messages.length - 1];
    const hasImage = Array.isArray(lastMsg.content) && lastMsg.content.some((c: any) => c.type === 'image');
    
    if (hasImage) {
      return `[Vision] I see an image! Switching worked perfectly.`;
    }
    return `[Vision] Text-only response.`;
  }
}

class MockFailingProvider extends BaseProvider {
  readonly name = 'MockFailing';
  protected apiKey = 'none';
  protected apiUrl = 'http://localhost';
  listModels(): ModelInfo[] { 
    return [{ id: 'fail-model', capabilities: ['text'] }]; 
  }
  async complete(): Promise<string> { 
    throw new Error('Simulated Failure'); 
  }
}

async function runScenarioTests() {
  console.log('🚀 FLUX GATEWAY SCENARIO TESTS\n');

  // SETUP: 1 Text-Only (Priority), 1 Vision (Fallback)
  const switcher = new ChatSwitcher({
    providers: [
      new MockTextProvider(),
      new MockVisionProvider()
    ],
    onEvent: (e: GatewayEvent) => {
      if (e.type === 'attempt_start') console.log(`   🔍 Starting: ${e.provider} (${e.model})`);
      if (e.type === 'attempt_success') console.log(`   ✅ Success: ${e.provider}`);
      if (e.type === 'attempt_failure') console.log(`   ❌ Failure: ${e.provider} - ${e.failureClass}`);
    }
  });

  console.log('1️⃣  TEST: Automatic Capability Switching');
  console.log('   Action: Sending an image. First provider is Text-only.');
  const visionRes = await switcher.chat([
    { role: 'user', content: [
      { type: 'text', text: 'Analyze this' },
      { type: 'image', source: { kind: 'url', url: 'https://example.com/test.jpg' } }
    ]}
  ]);
  console.log(`   Result: Response from ${visionRes.provider}. Content: ${visionRes.content}`);

  console.log('\n2️⃣  TEST: Session History Memory');
  const manager = new SessionManager(switcher);
  const session = manager.getSession('Alice-123', { maxHistory: 10 });

  console.log('   - Msg 1: My name is Alice and my SECRET-KEY is 8888.');
  await session.ask('My name is Alice and my SECRET-KEY is 8888.');

  console.log('   - Msg 2: Asking identity...');
  const memoryRes = await session.ask('What is my secret key?');
  console.log(`   Result: ${memoryRes.content}`);

  console.log('\n3️⃣  TEST: History Persistence Across Model Switch');
  const bobStore = new InMemoryStore();
  
  // Step A: Store history using one model
  const tempSwitcher = new ChatSwitcher({ providers: [new MockTextProvider()] });
  const sessionA = new SessionManager(tempSwitcher, bobStore).getSession('Bob-456');
  await sessionA.ask('My secret is "BOB-99"');

  // Step B: Connect a failing model in front of the working one
  const failoverSwitcher = new ChatSwitcher({
    providers: [
      new MockFailingProvider(),
      new MockTextProvider()
    ]
  });
  const sessionB = new SessionManager(failoverSwitcher, bobStore).getSession('Bob-456');
  
  console.log('   Action: Bob asks secret from a failing model stack.');
  const crossModelRes = await sessionB.ask('What is my secret?');

  console.log(`   Result: ${crossModelRes.content} (Received from ${crossModelRes.provider})`);

  console.log('\n🏁 ALL SCENARIOS COMPLETED');
}

runScenarioTests().catch(console.error);
