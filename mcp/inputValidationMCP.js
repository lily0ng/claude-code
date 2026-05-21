import { CONFIG } from '../config.js';

export class InputValidationMCP {
  constructor() {
    this.name = 'InputValidationMCP';
    this.category = 'security';
    this.enabled = CONFIG.mcp.inputValidation.enabled;
    this.maxMessageLength = CONFIG.mcp.inputValidation.maxMessageLength;
    this.maxMessagesPerConversation = CONFIG.mcp.inputValidation.maxMessagesPerConversation;
    this.lastResult = null;
    this.conversationCounts = new Map();
  }

  async processInput(message, context = {}) {
    if (!this.enabled) {
      this.lastResult = { passed: true };
      return this.lastResult;
    }

    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const violations = [];
    const convId = context.conversationId || context.sessionId || 'default';

    if (!text || text.trim().length === 0) {
      violations.push({ field: 'content', reason: 'empty', severity: 'high' });
    }

    if (text.length > this.maxMessageLength) {
      violations.push({ field: 'content', reason: `exceeds max length (${text.length} > ${this.maxMessageLength})`, severity: 'high' });
    }

    const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
    if (controlChars) {
      violations.push({ field: 'content', reason: `contains ${controlChars.length} control character(s)`, severity: 'medium' });
    }

    const maxRepeat = /(.)\1{50,}/g;
    if (maxRepeat.test(text)) {
      violations.push({ field: 'content', reason: 'excessive character repetition', severity: 'low' });
    }

    const maxUrl = (text.match(/https?:\/\//g) || []).length;
    if (maxUrl > 20) {
      violations.push({ field: 'content', reason: `excessive URLs (${maxUrl})`, severity: 'low' });
    }

    const convCount = this.conversationCounts.get(convId) || 0;
    this.conversationCounts.set(convId, convCount + 1);

    if (convCount >= this.maxMessagesPerConversation) {
      violations.push({ field: 'conversation', reason: `exceeds max messages (${convCount} >= ${this.maxMessagesPerConversation})`, severity: 'high' });
    }

    const severityLevels = { high: 3, medium: 2, low: 1 };
    const maxSeverity = violations.length > 0
      ? Math.max(...violations.map(v => severityLevels[v.severity] || 0))
      : 0;

    const passed = maxSeverity < 3;

    this.lastResult = {
      passed,
      violations,
      maxSeverity: maxSeverity >= 3 ? 'high' : maxSeverity >= 2 ? 'medium' : maxSeverity >= 1 ? 'low' : 'none',
      messageLength: text.length,
      action: passed ? 'allow' : (violations.some(v => v.severity === 'high') ? 'block' : 'flag'),
      message: violations.length === 0
        ? 'Input validation passed'
        : `Validation: ${violations.map(v => v.reason).join(', ')}`,
    };

    return this.lastResult;
  }

  async processOutput(response) {
    return { passed: true };
  }

  getLastResult() {
    return this.lastResult;
  }

  reset() {
    this.conversationCounts.clear();
  }

  autoConfigure(context = {}) {
    if (context.maxMessageLength) this.maxMessageLength = context.maxMessageLength;
    if (context.maxMessagesPerConversation) this.maxMessagesPerConversation = context.maxMessagesPerConversation;
  }

  checkHealth() {
    return true;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      maxMessageLength: this.maxMessageLength,
      maxMessagesPerConversation: this.maxMessagesPerConversation,
      activeConversations: this.conversationCounts.size,
    };
  }
}
