/// <reference types="node" />
import { ChatSwitcher, Provider, Message, ChatOptions } from '../src/index.js';

class MockProvider implements Provider {
  public callCount = 0;
  constructor(public readonly name: string, private shouldFail: boolean = false) {}

  async complete(_messages: Message[], _options: ChatOptions): Promise<string> {
    this.callCount++;
    if (this.shouldFail) {
      throw new Error(`Mock error from ${this.name}`);
    }
    return `Hello from ${this.name}! This is a mock response.`;
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
    new MockProvider('A-fail', true),
    new MockProvider('B-fail', true),
    new MockProvider('C-ok', false),
    new MockProvider('D-ok', false),
  ];
  const switcher = new ChatSwitcher({ providers, logger: null });
  const result = await switcher.chat([{ role: 'user', content: 'test' }]);
  assert(result.provider === 'C-ok', `Rotated to C-ok (got ${result.provider})`);
  assert(providers[3].callCount === 0, `D-ok was never called (short-circuit)`);
}

async function testCooldown() {
  console.log('\n--- Test 2: Failure-streak cooldown ---');
  const bad = new MockProvider('Bad', true);
  const good = new MockProvider('Good', false);

  const switcher = new ChatSwitcher({
    providers: [bad, good],
    retryCount: 0,
    failureThreshold: 2,
    cooldownMs: 10_000,
    logger: null,
  });

  // 3 requests: Bad fails each time, Good succeeds. After 2 Bad failures,
  // Bad should enter cooldown and be skipped on the 3rd call.
  await switcher.chat([{ role: 'user', content: '1' }]);
  await switcher.chat([{ role: 'user', content: '2' }]);
  const callCountBeforeSkip = bad.callCount;
  await switcher.chat([{ role: 'user', content: '3' }]);

  assert(
    bad.callCount === callCountBeforeSkip,
    `Bad was skipped on 3rd call (calls: ${bad.callCount}, expected ${callCountBeforeSkip})`
  );

  const health = switcher.getHealth();
  const badHealth = health.find((h) => h.name === 'Bad')!;
  assert(badHealth.cooldownUntil > Date.now(), `Bad is in cooldown`);
  assert(good.callCount === 3, `Good handled all 3 requests`);
}

async function testAllFail() {
  console.log('\n--- Test 3: All providers fail → throw ---');
  const switcher = new ChatSwitcher({
    providers: [new MockProvider('X', true), new MockProvider('Y', true)],
    logger: null,
  });
  try {
    await switcher.chat([{ role: 'user', content: 'test' }]);
    assert(false, 'Should have thrown');
  } catch (e: any) {
    assert(/All providers failed/.test(e.message), `Threw expected error: ${e.message}`);
  }
}

async function main() {
  await testRotation();
  await testCooldown();
  await testAllFail();

  console.log(`\n${failures === 0 ? '🎉 All tests passed' : `💥 ${failures} assertion(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
