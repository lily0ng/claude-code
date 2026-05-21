import { CONFIG } from '../config.js';

export class CacheMCP {
  constructor() {
    this.name = 'CacheMCP';
    this.category = 'performance';
    this.enabled = CONFIG.mcp.cache.enabled;
    this.ttlMs = CONFIG.mcp.cache.ttlMs;
    this.maxEntries = CONFIG.mcp.cache.maxEntries;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.lastResult = null;
  }

  _makeKey(model, messages) {
    const msgStr = messages.map(m => `${m.role}:${m.content}`).join('||');
    return `${model}|${msgStr}`;
  }

  async processInput(message, context = {}) {
    if (!this.enabled) {
      this.lastResult = { passed: true, cached: false };
      return this.lastResult;
    }
    this.lastResult = { passed: true, cached: false };
    return this.lastResult;
  }

  async processOutput(response, context = {}) {
    if (!this.enabled || !context.model || !context.messages) {
      return { passed: true, cached: false };
    }

    const key = this._makeKey(context.model, context.messages);
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing && (now - existing.timestamp) < this.ttlMs) {
      this.hits++;
      this.lastResult = { passed: true, cached: true, hit: true, age: now - existing.timestamp };
      return {
        passed: true,
        cached: true,
        response: existing.response,
        age: now - existing.timestamp,
      };
    }

    this._evictStale(now);
    this.cache.set(key, { response, timestamp: now, model: context.model });
    this.misses++;

    this.lastResult = { passed: true, cached: false, hit: false };
    return { passed: true, cached: false };
  }

  _evictStale(now) {
    if (this.cache.size < this.maxEntries) return;

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    while (this.cache.size >= this.maxEntries && entries.length > 0) {
      const [key] = entries.shift();
      this.cache.delete(key);
    }
  }

  get(key) {
    if (!key) return null;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if ((Date.now() - entry.timestamp) > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  invalidate(model) {
    if (!model) { this.clear(); return; }
    for (const [key, entry] of this.cache) {
      if (entry.model === model) this.cache.delete(key);
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }

  autoConfigure(context = {}) {
    if (context.ttlMs) this.ttlMs = context.ttlMs;
    if (context.maxEntries) this.maxEntries = context.maxEntries;
  }

  checkHealth() {
    return true;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      ...this.getStats(),
    };
  }
}
