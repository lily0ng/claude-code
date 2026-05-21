import { CONFIG } from '../config.js';

export class AuditLogMCP {
  constructor() {
    this.name = 'AuditLogMCP';
    this.enabled = CONFIG.mcp.auditLog.enabled;
    this.logLevel = CONFIG.mcp.auditLog.logLevel;
    this.logs = [];
    this.maxLogs = 1000;
    this.sessionId = this.generateId();
    this.outputLogs = [];
  }

  async processInput(message, context = {}) {
    if (!this.enabled) return { passed: true };

    const entry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'input',
      sessionId: this.sessionId,
      level: this.logLevel,
      action: context.action || 'request',
      provider: context.provider || 'unknown',
      model: context.model || 'unknown',
      metadata: {
        messageLength: typeof message === 'string' ? message.length : JSON.stringify(message).length,
        mcpResults: context.mcpResults || {},
        userAgent: context.userAgent || navigator?.userAgent || 'unknown',
        requestId: context.requestId || this.generateId(),
      },
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.persist(entry);

    return { passed: true, entry };
  }

  async processOutput(response, context = {}) {
    if (!this.enabled) return { passed: true };

    const entry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'output',
      sessionId: this.sessionId,
      level: this.logLevel,
      action: context.action || 'response',
      provider: context.provider || 'unknown',
      model: context.model || 'unknown',
      metadata: {
        responseLength: typeof response === 'string' ? response.length : JSON.stringify(response).length,
        latency: context.latency || null,
        mcpResults: context.mcpResults || {},
        tokensUsed: context.tokensUsed || null,
        finishReason: context.finishReason || null,
      },
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.persist(entry);

    return { passed: true, entry };
  }

  persist(entry) {
    try {
      const stored = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      stored.push(entry);
      if (stored.length > 500) stored.splice(0, stored.length - 500);
      localStorage.setItem('audit_logs', JSON.stringify(stored));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }

  getLogs(options = {}) {
    let filtered = [...this.logs];
    if (options.type) filtered = filtered.filter(l => l.type === options.type);
    if (options.provider) filtered = filtered.filter(l => l.provider === options.provider);
    if (options.since) filtered = filtered.filter(l => new Date(l.timestamp) > new Date(options.since));
    if (options.level) filtered = filtered.filter(l => l.level === options.level);
    return filtered.slice(-(options.limit || 100));
  }

  getSessionLogs() {
    return this.logs.filter(l => l.sessionId === this.sessionId);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      logLevel: this.logLevel,
      logCount: this.logs.length,
      sessionId: this.sessionId,
    };
  }
}
