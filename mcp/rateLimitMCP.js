import { CONFIG } from '../config.js';

export class RateLimitMCP {
  constructor() {
    this.name = 'RateLimitMCP';
    this.category = 'security';
    this.enabled = CONFIG.mcp.rateLimit.enabled;
    this.maxRequests = CONFIG.mcp.rateLimit.maxRequests;
    this.windowMs = CONFIG.mcp.rateLimit.windowMs;
    this.requests = new Map();
    this.lastResult = null;
  }

  async processInput(message, context = {}) {
    if (!this.enabled) {
      this.lastResult = { passed: true };
      return this.lastResult;
    }

    const clientId = context.clientId || context.sessionId || 'default';
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }

    const timestamps = this.requests.get(clientId).filter(t => t > windowStart);
    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    const currentCount = timestamps.length;
    const passed = currentCount <= this.maxRequests;

    this.lastResult = {
      passed,
      currentCount,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      resetAt: new Date(timestamps[0] + this.windowMs).toISOString(),
      action: passed ? 'allow' : 'block',
      message: passed
        ? `Rate limit: ${currentCount}/${this.maxRequests}`
        : `Rate limit exceeded: ${currentCount}/${this.maxRequests} requests per ${this.windowMs / 1000}s`,
    };

    return this.lastResult;
  }

  async processOutput(response) {
    return { passed: true };
  }

  getLastResult() {
    return this.lastResult;
  }

  reset(clientId) {
    if (clientId) this.requests.delete(clientId);
    else this.requests.clear();
  }

  autoConfigure(context = {}) {
    if (context.maxRequests) this.maxRequests = context.maxRequests;
    if (context.windowMs) this.windowMs = context.windowMs;
  }

  checkHealth() {
    return true;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      activeClients: this.requests.size,
    };
  }
}
