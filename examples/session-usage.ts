import {
  ChatSwitcher,
  PollinationsProvider,
  SessionManager,
  InMemoryStore
} from '../src/index.js';

/**
 * Chat Session & Memory Usage Example
 */
async function main() {
  const switcher = new ChatSwitcher({
    providers: [new PollinationsProvider()]
  });

  // 1. Initialize SessionManager
  const manager = new SessionManager(switcher);

  // 2. Create a session for a user
  const session = manager.getSession('user-42', {
    systemPrompt: 'You are a helpful assistant who remembers names.',
    maxHistory: 10
  });

  console.log('--- 🗨️ First interaction ---');
  await session.ask('Hi! My name is Shah Dost.');
  
  console.log('--- 🗨️ Second interaction (testing memory) ---');
  const response = await session.ask('What is my name?');
  
  console.log('AI Response:', response.content);
  console.log('Provider used:', response.provider);
  
  // 3. Show full history
  const history = await session.getHistory();
  console.log('\n--- 📝 Full History ---');
  history.forEach(m => console.log(`[${m.role}]: ${m.content}`));
}

main().catch(console.error);
