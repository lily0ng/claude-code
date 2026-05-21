import { CONFIG } from '../config.js';

export class TokenBudgetMCP {
  constructor() {
    this.name = 'TokenBudgetMCP';
    this.category = 'cost';
    this.enabled = CONFIG.mcp.tokenBudget.enabled;
    this.maxTokensPerSession = CONFIG.mcp.tokenBudget.maxTokensPerSession;
    this.warningThreshold = CONFIG.mcp.tokenBudget.warningThreshold;
    this.sessionUsage = new Map();
    this.totalUsage = 0;
    this.lastResult = null;
  }

  async processInput(message, context = {}) {
    if (!this.enabled) {
      this.lastResult = { passed: true };
      return this.lastResult;
    }

    const sessionId = context.sessionId || 'default';
    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const estimatedTokens = Math.ceil(text.length / 4);
    const currentUsage = this.sessionUsage.get(sessionId) || 0;
    const newUsage = currentUsage + estimatedTokens;

    this.sessionUsage.set(sessionId, newUsage);
    this.totalUsage += estimatedTokens;

    const usageRatio = newUsage / this.maxTokensPerSession;
    const passed = usageRatio < 1;
    const isWarning = usageRatio >= this.warningThreshold;

    this.lastResult = {
      passed,
      isWarning,
      sessionTokens: newUsage,
      estimatedInput: estimatedTokens,
      maxTokens: this.maxTokensPerSession,
      usageRatio,
      action: passed ? 'allow' : 'block',
      message: isWarning
        ? `Token warning: ${Math.round(usageRatio * 100)}% of budget used`
        : `Tokens: ${newUsage}/${this.maxTokensPerSession}`,
    };

    return this.lastResult;
  }

  async processOutput(response, context = {}) {
    if (!this.enabled || !context.tokensUsed) return { passed: true };

    const sessionId = context.sessionId || 'default';
    const outputTokens = context.tokensUsed.outputTokens || context.tokensUsed.candidatesTokens || 0;
    const currentUsage = this.sessionUsage.get(sessionId) || 0;
    const newUsage = currentUsage + outputTokens;
    this.sessionUsage.set(sessionId, newUsage);

    return {
      passed: newUsage <= this.maxTokensPerSession,
      sessionTokens: newUsage,
      estimatedOutput: outputTokens,
    };
  }

  getLastResult() {
    return this.lastResult;
  }

  reset(sessionId) {
    if (sessionId) this.sessionUsage.delete(sessionId);
    else this.sessionUsage.clear();
  }

  getUsage(sessionId) {
    return this.sessionUsage.get(sessionId) || 0;
  }

  autoConfigure(context = {}) {
    if (context.maxTokensPerSession) this.maxTokensPerSession = context.maxTokensPerSession;
    if (context.warningThreshold) this.warningThreshold = context.warningThreshold;
  }

  checkHealth() {
    return true;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      maxTokensPerSession: this.maxTokensPerSession,
      activeSessions: this.sessionUsage.size,
      totalUsage: this.totalUsage,
    };
  }
}
