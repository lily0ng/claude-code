import { PromptInjectionMCP } from './promptInjectionMCP.js';
import { PIIDetectionMCP } from './piDetectionMCP.js';
import { ContentModerationMCP } from './contentModerationMCP.js';
import { AuditLogMCP } from './auditLogMCP.js';

export class MCPPipeline {
  constructor() {
    this.inputPlugins = [];
    this.outputPlugins = [];
    this.auditLog = new AuditLogMCP();
    this.results = {};
    this.lastInputResult = null;
    this.lastOutputResult = null;
    this.listeners = [];

    this.register(new PromptInjectionMCP());
    this.register(new PIIDetectionMCP());
    this.register(new ContentModerationMCP());
  }

  register(plugin) {
    this.inputPlugins.push(plugin);
    this.outputPlugins.push(plugin);
    return this;
  }

  async processInput(message, context = {}) {
    this.results = {};
    const mcpResults = {};

    for (const plugin of this.inputPlugins) {
      try {
        const result = await plugin.processInput(message, context);
        mcpResults[plugin.name] = result;
        this.results[plugin.name] = result;

        if (result.action === 'block') {
          this.lastInputResult = mcpResults;
          this.notify({ type: 'block', plugin: plugin.name, result });
          await this.auditLog.processInput(message, {
            ...context, action: 'blocked', mcpResults,
          });
          return {
            passed: false,
            blockedBy: plugin.name,
            message: result.message,
            results: mcpResults,
          };
        }

        if (result.redacted && result.redactedText) {
          message = result.redactedText;
        }
      } catch (err) {
        console.error(`MCP plugin ${plugin.name} error:`, err);
        mcpResults[plugin.name] = { passed: true, error: err.message };
      }
    }

    this.lastInputResult = mcpResults;
    await this.auditLog.processInput(message, {
      ...context, action: 'allowed', mcpResults,
    });

    this.notify({ type: 'allowed', results: mcpResults });

    return {
      passed: true,
      message,
      results: mcpResults,
    };
  }

  async processOutput(response, context = {}) {
    const mcpResults = {};

    for (const plugin of this.outputPlugins) {
      try {
        const result = await plugin.processOutput(response, context);
        mcpResults[plugin.name] = result;
        this.results[`${plugin.name}_output`] = result;
      } catch (err) {
        console.error(`MCP output plugin ${plugin.name} error:`, err);
        mcpResults[plugin.name] = { passed: true, error: err.message };
      }
    }

    this.lastOutputResult = mcpResults;
    await this.auditLog.processOutput(response, {
      ...context, mcpResults,
    });

    this.notify({ type: 'output', results: mcpResults });

    return {
      passed: true,
      response,
      results: mcpResults,
    };
  }

  getLastResults() {
    return { input: this.lastInputResult, output: this.lastOutputResult };
  }

  getPlugin(name) {
    return this.inputPlugins.find(p => p.name === name);
  }

  getResults() {
    return this.results;
  }

  getAuditLogs(options = {}) {
    return this.auditLog.getLogs(options);
  }

  onChange(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event) {
    for (const listener of this.listeners) {
      try { listener(event); } catch (err) { console.error('MCP listener error:', err); }
    }
  }

  getMetadata() {
    return {
      inputPlugins: this.inputPlugins.map(p => p.getMetadata()),
      auditLog: this.auditLog.getMetadata(),
    };
  }
}
