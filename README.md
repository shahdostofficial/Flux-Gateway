# ⚡ FluxGateway

### The Universal AI Request Switcher & Gateway

**FluxGateway** is an open-source, lightweight AI router that provides continuous, reliable access to multiple LLM providers. It automatically rotates through providers (like OpenRouter, Groq, and more) when you hit rate limits or encounter failures, ensuring your application stays online.

---

## ✨ Features

- 🔄 **Auto-Rotation**: Seamlessly switch to the next provider on failure or rate limit.
- 🌍 **Multi-Provider Support**: Built-in support for OpenRouter, Groq, TogetherAI, and Meridian Blue.
- 📦 **Minimalist**: Tiny footprint, easy to integrate into any Node.js project.
- 🛡️ **Reliability**: Designed for production uptime.
- 🔌 **Extensible**: Easily add your own custom providers.

---

## 🚀 Quick Start

### Installation

```bash
npm install flux-gateway
```

### Usage

```typescript
import {
  ChatSwitcher,
  OpenRouterProvider,
  GroqProvider
} from 'flux-gateway';

const providers = [
  new OpenRouterProvider('YOUR_OPENROUTER_KEY'),
  new GroqProvider('YOUR_GROQ_KEY')
];

const switcher = new ChatSwitcher({ providers, retryCount: 1 });

const response = await switcher.chat([
  { role: 'user', content: 'What is the speed of light?' }
]);

console.log(`Answer from ${response.provider}:`, response.content);
```

### CLI

FluxGateway also ships with a `flux-gateway` CLI. Create a `.env` file (see `.env.example`) with any keys you own, then:

```bash
npx flux-gateway ask "Explain quantum entanglement in one sentence."
npx flux-gateway ask "Write a haiku about TypeScript" -m llama3-70b-8192
```

---

## 🛠 Supported Providers

| Provider | Class | Default Model |
| :--- | :--- | :--- |
| OpenRouter | `OpenRouterProvider` | `meta-llama/llama-3.2-3b-instruct:free` |
| Groq | `GroqProvider` | `llama-3.1-8b-instant` |
| TogetherAI | `TogetherProvider` | `mistralai/Mistral-7B-Instruct-v0.1` |
| DeepSeek | `DeepSeekProvider` | `deepseek-chat` |
| HuggingFace | `HuggingFaceProvider` | `mistralai/Mistral-7B-Instruct-v0.2` |
| ShuttleAI | `ShuttleAIProvider` | `shuttle-2` |
| DeepInfra | `DeepInfraProvider` | `meta-llama/Meta-Llama-3-8B-Instruct` |
| **Cerebras** ⚡ | `CerebrasProvider` | `llama3.1-8b` |
| **SambaNova** ⚡ | `SambaNovaProvider` | `Meta-Llama-3.3-70B-Instruct` |
| **Cloudflare Workers AI** ⚡ | `CloudflareWorkersAIProvider` | `@cf/meta/llama-3.1-8b-instruct` |
| **Pollinations** 🆓 | `PollinationsProvider` | `openai` *(no API key required)* |

> **⚡ = gateway aggregator** (one key gives access to many open models).
> **🆓 Pollinations** needs **no API key** — community-run, no SLA. Use as a last-resort fallback, not a primary provider.
>
> Need another provider? Extend `BaseProvider` — it handles the OpenAI-compatible request/response shape for you.

## 🧠 Smart failover (v1.1+)

`ChatSwitcher` tracks per-provider health automatically:

- On repeated failures (default: **3 in a row**), a provider enters a cooldown (default: **60s**) and is skipped.
- Any successful call resets that provider's failure counter.
- `switcher.getHealth()` returns a snapshot for diagnostics.
- `switcher.resetHealth()` clears all cooldowns.

```typescript
const switcher = new ChatSwitcher({
  providers: [...],
  retryCount: 1,
  failureThreshold: 3,   // 3 consecutive failures → cooldown (0 disables)
  cooldownMs: 60_000,    // 60s cooldown
  logger: console,       // or `null` to silence
});
```

### Recommended production stack

```typescript
import {
  ChatSwitcher,
  GroqProvider,
  CerebrasProvider,
  OpenRouterProvider,
  CloudflareWorkersAIProvider,
  SambaNovaProvider,
} from 'flux-gateway';

const switcher = new ChatSwitcher({
  providers: [
    new GroqProvider(process.env.GROQ_API_KEY!),                  // primary: fast + high free limits
    new CerebrasProvider(process.env.CEREBRAS_API_KEY!),          // fast backup
    new OpenRouterProvider(process.env.OPENROUTER_API_KEY!),      // widest model catalog
    new CloudflareWorkersAIProvider(                              // edge-hosted, reliable
      process.env.CLOUDFLARE_ACCOUNT_ID!,
      process.env.CLOUDFLARE_API_KEY!,
    ),
    new SambaNovaProvider(process.env.SAMBANOVA_API_KEY!),        // large models fallback
  ],
  failureThreshold: 3,
  cooldownMs: 60_000,
});
```

> Need zero-config local dev? Add `new PollinationsProvider()` at the end — works with no API key, but don't rely on it in production (community-run, no SLA).

---

## 🎨 Why FluxGateway?

In a world where free tiers are limited and APIs can be unstable, **FluxGateway** acts as a "Universal Gateway for Universal Gateways." It abstracts the complexity of multiple API formats into a single, reliable stream.

---

# Flux-Gateway
