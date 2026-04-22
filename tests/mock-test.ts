/// <reference types="node" />
import {
  ChatSwitcher,
  Provider,
  Message,
  ChatOptions,
  ModelInfo,
  Capability,
  GatewayEvent,
  FailureClass,
} from '../src/index.js';

class MockProvider implements Provider {
  public callCount = 0;
  constructor(
    public readonly name: string,
    private models: ModelInfo[] = [{ id: 'text-model', capabilities: ['text'] }],
    private forcedFailure?: FailureClass
  ) {}

  listModels(): ModelInfo[] {
    return this.models;
  }

  supports(cap: Capability): boolean {
    return this.models.some((m) => m.capabilities.includes(cap));
  }

  async complete(_messages: Message[], _options: ChatOptions): Promise<string> {
    this.callCount++;
    if (this.forcedFailure) {
      const err: any = new Error(`Mock error from ${this.name}`);
      err.failureClass = this.forcedFailure;
      throw err;
    }
    return `Hello from ${this.name}!`;
  }
}

let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`✅ ${label}`);
  } else {
    console.log(`❌ ${label}`);
    failures++;
  }
}

async function testRotation() {
  console.log('\n--- Test 1: Basic rotation past failing providers ---');
  const providers = [
    new MockProvider('A-fail', undefined, 'server_error'),
    new MockProvider('B-ok', [{ id: 'm', capabilities: ['text'] }]),
  ];
  const switcher = new ChatSwitcher({ providers, logger: null });
  const result = await switcher.chat([{ role: 'user', content: 'test' }]);
  assert(result.provider === 'B-ok', `Rotated to B-ok (got ${result.provider})`);
}

async function testCapabilities() {
  console.log('\n--- Test 2: Capability filtering (Vision) ---');
  const textOnly = new MockProvider('TextOnly', [{ id: 't', capabilities: ['text'] }]);
  const visionOk = new MockProvider('VisionOk', [{ id: 'v', capabilities: ['text', 'image_input'] }]);
  
  const switcher = new ChatSwitcher({ providers: [textOnly, visionOk], logger: null });
  
  // Request with image
  const result = await switcher.chat([
    { 
      role: 'user', 
      content: [
        { type: 'text', text: 'hi' },
        { type: 'image', source: { kind: 'url', url: 'http' } }
      ] 
    }
  ]);
  
  assert(result.provider === 'VisionOk', `Selected vision provider (got ${result.provider})`);
  assert(textOnly.callCount === 0, 'TextOnly was never even tried');
}

async function testErrorTaxonomy() {
  console.log('\n--- Test 3: Error Taxonomy Cooldowns ---');
  const authFailing = new MockProvider('AuthBad', [{ id: 'm', capabilities: ['text'] }], 'auth_error');
  const rateFailing = new MockProvider('RateBad', [{ id: 'm', capabilities: ['text'] }], 'rate_limit');
  const ok = new MockProvider('Ok', [{ id: 'm', capabilities: ['text'] }]);

  const switcher = new ChatSwitcher({
    providers: [authFailing, rateFailing, ok],
    failureThreshold: 1, // trigger cooldown immediately
    logger: null,
  });

  // Attempt 1: AuthBad fails with auth_error
  await switcher.chat([{ role: 'user', content: '1' }]);
  const health = switcher.getHealth();
  const authHealth = health.find(h => h.name === 'AuthBad')!;
  const rateHealth = health.find(h => h.name === 'RateBad')!;
  
  const authCooldown = authHealth.cooldownUntil - Date.now();
  const rateCooldown = rateHealth.cooldownUntil - Date.now();

  assert(authCooldown > 20 * 60 * 1000, `Auth error triggered long cooldown (~${Math.round(authCooldown/60000)}m)`);
  assert(rateCooldown > 0 && rateCooldown < 20000, `Rate limit triggered short cooldown (~${Math.round(rateCooldown/1000)}s)`);
}

async function testEvents() {
  console.log('\n--- Test 4: Event Emission ---');
  const events: GatewayEvent[] = [];
  const providers = [
    new MockProvider('A', [{ id: 'm', capabilities: ['text'] }], 'server_error'),
    new MockProvider('B', [{ id: 'm', capabilities: ['text'] }]),
  ];
  
  const switcher = new ChatSwitcher({
    providers,
    onEvent: (e) => events.push(e),
    logger: null
  });

  await switcher.chat([{ role: 'user', content: 'test' }]);

  const types = events.map(e => e.type);
  assert(types.includes('attempt_start'), 'Emitted attempt_start');
  assert(types.includes('attempt_failure'), 'Emitted attempt_failure');
  assert(types.includes('attempt_success'), 'Emitted attempt_success');
  
  const failEvent = events.find(e => e.type === 'attempt_failure') as any;
  assert(failEvent.failureClass === 'server_error', 'Recorded correct failure class');
}

async function main() {
  try {
    await testRotation();
    await testCapabilities();
    await testErrorTaxonomy();
    await testEvents();
    
    console.log(`\n${failures === 0 ? '🎉 All scenarios passed' : `💥 ${failures} assertion(s) failed`}`);
    process.exit(failures === 0 ? 0 : 1);
  } catch (e) {
    console.error('Test runner crashed:', e);
    process.exit(1);
  }
}

main();
