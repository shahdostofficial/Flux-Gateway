# ⚡ FluxGateway

### The Universal AI Request Switcher & Gateway

**FluxGateway** is an open-source, lightweight AI router that provides continuous, reliable access to multiple LLM providers. It automatically rotates through providers (like OpenRouter, Groq, and more) when you hit rate limits or encounter failures, ensuring your application stays online.

---

## ✨ Features (v1.2.0)

- 🔄 **Auto-Rotation**: Seamlessly switch to the next provider on failure or rate limit.
- 🖼️ **Multimodal Support**: Send images together with text prompts (vision-capable models).
- 🧠 **Capability-Aware Routing**: Automatically filters providers based on request needs (text vs image).
- 🛡️ **Error Taxonomy**: Smart cooldowns (e.g., long cooldown for dead keys, short for rate limits).
- 💭 **Stateful Memory**: Built-in session management with pluggable storage adapters (Redis, DB, InMemory).
- 📊 **Production Telemetry**: Event emitter pattern for monitoring attempts, successes, and failures.
- 🔌 **Extensible**: Easily add your own custom providers.

---

## 🚀 Quick Start

### Installation

```bash
npm install flux-gateway
```

### Usage (Text + Image)

```typescript
import { ChatSwitcher, OpenRouterProvider, GroqProvider } from 'flux-gateway';

const switcher = new ChatSwitcher({
  providers: [
    new OpenRouterProvider('YOUR_OPENROUTER_KEY'),
    new GroqProvider('YOUR_GROQ_KEY')
  ],
  onEvent: (e) => console.log(`[GW] ${e.type}: ${e.provider}`) // Telemetry
});

const response = await switcher.chat([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image', source: { kind: 'url', url: 'https://example.com/cat.jpg' } }
    ]
  }
]);

console.log(`Answer:`, response.content);
```

### Usage (Conversational Memory)

FluxGateway provides a built-in `SessionManager` to handle multi-turn conversational history. It comes with an `InMemoryStore` by default, but you can implement `SessionStore` to plug in your own Redis, Postgres, or MongoDB adapter.

```typescript
import { ChatSwitcher, SessionManager, InMemoryStore, OpenRouterProvider } from 'flux-gateway';

const switcher = new ChatSwitcher({
  providers: [new OpenRouterProvider('YOUR_OPENROUTER_KEY')]
});

// Initialize session manager with a choice of storage adapter
const manager = new SessionManager(switcher, new InMemoryStore());

// Get a session tied to a specific user or chat ID
const session = manager.getSession('user_123', {
  systemPrompt: 'You are a helpful AI assistant.',
  maxHistory: 10 // Keeps last 10 messages to save context window
});

// The session remembers previous interactions automatically
const reply1 = await session.ask('Hi, my name is Alice!');
console.log(reply1.content);

const reply2 = await session.ask('What is my name?');
console.log(reply2.content); // Output: "Your name is Alice!"
```

### CLI

 FluxGateway also ships with a `flux-gateway` CLI.

```bash
# Basic prompt
npx flux-gateway ask "Explain relativity"

# Vision prompt
npx flux-gateway ask "What is this?" --image "https://example.com/cat.jpg"

# Debug mode (sees rotation logs)
FLUX_DEBUG=1 npx flux-gateway ask "Hi"
```

---

## 🛠 Supported Providers

| Provider | Class | Capabilities |
| :--- | :--- | :--- |
| OpenRouter | `OpenRouterProvider` | `text`, `image_input` |
| Groq | `GroqProvider` | `text` |
| TogetherAI | `TogetherProvider` | `text` |
| DeepSeek | `DeepSeekProvider` | `text` |
| HuggingFace | `HuggingFaceProvider` | `text` |
| ShuttleAI | `ShuttleAIProvider` | `text` |
| DeepInfra | `DeepInfraProvider` | `text` |
| **Cerebras** | `CerebrasProvider` | `text` |
| **SambaNova** | `SambaNovaProvider` | `text` |
| **Cloudflare** | `CloudflareWorkersAIProvider` | `text` |
| **Pollinations** | `PollinationsProvider` | `text`, `image_input` |
| **Meridian Blue** | `MeridianBlueProvider` | `text` |

---

## 🧠 Smart Failover (Production-Grade)

`ChatSwitcher` tracks per-provider health with an intelligent error taxonomy:

- **Auth Errors**: Dead keys trigger a **30-minute cooldown**.
- **Rate Limits**: Trigger a short **10-second cooldown**.
- **Server Errors**: Standard **60-second cooldown**.
- **Task Blindness**: If a provider doesn't support a capability (e.g. vision), it is **pre-filtered** out of the rotation entirely for that request.

### Telemetry & Observability

Use the `onEvent` callback to pipe metrics to your logging system:

```typescript
const switcher = new ChatSwitcher({
  providers: [...],
  onEvent: (event) => {
    if (event.type === 'attempt_failure') {
      metrics.increment('ai_gateway_fail', { provider: event.provider, class: event.failureClass });
    }
  }
});
```

---

## 🎨 Why FluxGateway?

In a world where free tiers are limited and APIs can be unstable, **FluxGateway** acts as a "Universal Gateway for Universal Gateways." It abstracts the complexity of multiple API formats and failure modes into a single, reliable stream that **guarantees** a response if at least one path is alive.

---

# Flux-Gateway
