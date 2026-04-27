import { Message, ChatOptions, ChatResult } from './types.js';
import { ChatSwitcher } from './Switcher.js';

export interface SessionOptions {
  /** Maximum number of messages to keep in history. Default 20. */
  maxHistory?: number;
  /** System prompt to keep at the start of the conversation. */
  systemPrompt?: string;
}

/**
 * Interface for session storage. 
 * Allows users to implement their own persistent storage (Redis, DB, etc.)
 */
export interface SessionStore {
  get(sessionId: string): Promise<Message[] | undefined>;
  set(sessionId: string, history: Message[]): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(): Promise<string[]>;
}

/**
 * Default volatile in-memory storage.
 */
export class InMemoryStore implements SessionStore {
  private data = new Map<string, Message[]>();

  async get(sessionId: string) { return this.data.get(sessionId); }
  async set(sessionId: string, history: Message[]) { this.data.set(sessionId, history); }
  async delete(sessionId: string) { this.data.delete(sessionId); }
  async list() { return Array.from(this.data.keys()); }
}

/**
 * ChatSession manages the conversation history for a specific user/topic.
 */
export class ChatSession {
  constructor(
    public readonly sessionId: string,
    private switcher: ChatSwitcher,
    private store: SessionStore,
    private options: SessionOptions = {}
  ) {}

  /**
   * Send a message in this session context.
   */
  async ask(content: string | import('./types.js').ContentPart[], options: ChatOptions = {}): Promise<ChatResult> {
    // 1. Get history from store
    let history = (await this.store.get(this.sessionId)) || [];
    
    // Add system prompt if new session
    if (history.length === 0 && this.options.systemPrompt) {
      history.push({ role: 'system', content: this.options.systemPrompt });
    }

    // 2. Append user message
    history.push({ role: 'user', content });

    // 3. Truncate if history exceeds limit
    const limit = this.options.maxHistory ?? 20;
    if (history.length > limit) {
      const hasSystem = this.options.systemPrompt && history[0].role === 'system';
      const keepCount = limit - (hasSystem ? 1 : 0);
      const newHistory = history.slice(history.length - keepCount);
      history = hasSystem ? [history[0], ...newHistory] : newHistory;
    }

    // 4. Call switcher
    const result = await this.switcher.chat(history, options);
    
    // 5. Append assistant response and save to store
    history.push({ role: 'assistant', content: result.content });
    await this.store.set(this.sessionId, history);
    
    return result;
  }

  async getHistory(): Promise<Message[]> {
    return (await this.store.get(this.sessionId)) || [];
  }

  async clear(): Promise<void> {
    const initial: Message[] = this.options.systemPrompt 
      ? [{ role: 'system', content: this.options.systemPrompt }] 
      : [];
    await this.store.set(this.sessionId, initial);
  }
}

/**
 * SessionManager handles multiple concurrent ChatSessions.
 */
export class SessionManager {
  private store: SessionStore;

  constructor(private switcher: ChatSwitcher, store?: SessionStore) {
    this.store = store || new InMemoryStore();
  }

  /**
   * Get a session by ID.
   */
  getSession(sessionId: string, options: SessionOptions = {}): ChatSession {
    return new ChatSession(sessionId, this.switcher, this.store, options);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }

  async listSessions(): Promise<string[]> {
    return this.store.list();
  }
}
