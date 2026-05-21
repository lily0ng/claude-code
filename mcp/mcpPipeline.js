import { MCPRegistry } from './mcpRegistry.js';
import { PromptInjectionMCP } from './promptInjectionMCP.js';
import { PIIDetectionMCP } from './piDetectionMCP.js';
import { ContentModerationMCP } from './contentModerationMCP.js';
import { AuditLogMCP } from './auditLogMCP.js';
import { RateLimitMCP } from './rateLimitMCP.js';
import { TokenBudgetMCP } from './tokenBudgetMCP.js';
import { InputValidationMCP } from './inputValidationMCP.js';
import { ModelGatingMCP } from './modelGatingMCP.js';
import { CacheMCP } from './cacheMCP.js';
import { CONFIG } from '../config.js';

export class MCPPipeline {
  constructor() {
    this.registry = new MCPRegistry();
    this.auditLog = new AuditLogMCP();
    this.lastInputResults = null;
    this.lastOutputResults = null;
    this.listeners = [];
    this.healthInterval = null;

    this._registerDefaults();
    this._startHealthChecks();
    this._setupAutoConfig();
  }

  _registerDefaults() {
    const builtins = [
      { instance: new PromptInjectionMCP(), priority: 10, category: 'security' },
      { instance: new PIIDetectionMCP(), priority: 20, category: 'privacy' },
      { instance: new ContentModerationMCP(), priority: 30, category: 'moderation' },
      { instance: new RateLimitMCP(), priority: 5, category: 'security' },
      { instance: new InputValidationMCP(), priority: 1, category: 'security' },
      { instance: new TokenBudgetMCP(), priority: 40, category: 'cost' },
      { instance: new ModelGatingMCP(), priority: 15, category: 'compliance' },
      { instance: new CacheMCP(), priority: 50, category: 'performance' },
    ];

    for (const { instance, priority, category } of builtins) {
      if (instance.enabled !== false) {
        this.registry.register(instance, { priority, category });
      }
    }
  }

  _startHealthChecks() {
    const interval = CONFIG.mcpAutomation?.healthCheckInterval || 30000;
    this.healthInterval = setInterval(() => {
      this.registry.checkHealth().then(results => {
        this.notify({ type: 'health', results });
      });
    }, interval);
  }

  _setupAutoConfig() {
    this.registry.on('afterRegister', ({ entry }) => {
      this.notify({ type: 'pluginRegistered', plugin: entry.name, category: entry.category });
    });
  }

  registerPlugin(plugin, options = {}) {
    this.registry.register(plugin, options);
    this.notify({ type: 'pluginRegistered', plugin: plugin.name, options });
    return this;
  }

  unregisterPlugin(name) {
    const removed = this.registry.unregister(name);
    if (removed) this.notify({ type: 'pluginUnregistered', plugin: name });
    return removed;
  }

  getPlugin(name) {
    return this.registry.get(name);
  }

  getAllPlugins() {
    return this.registry.getAll();
  }

  getPluginsByCategory(category) {
    return this.registry.getByCategory(category);
  }

  setPluginEnabled(name, enabled) {
    this.registry.setEnabled(name, enabled);
    this.notify({ type: 'pluginToggled', plugin: name, enabled });
  }

  async processInput(message, context = {}) {
    const mcpResults = {};
    const plugins = this.registry.getInputPlugins();
    let processedMessage = message;

    this.registry.runHook('beforeProcess', { message, context });

    for (const entry of plugins) {
      try {
        const result = await entry.plugin.processInput(processedMessage, {
          ...context,
          sessionId: this.auditLog.sessionId,
        });

        mcpResults[entry.name] = result;

        if (result.cached && result.response) {
          this.registry.runHook('afterProcess', { result, cached: true });
          this.lastInputResults = mcpResults;
          this.notify({ type: 'allowed', results: mcpResults });
          return { passed: true, cached: true, response: result.response, results: mcpResults };
        }

        if (result.action === 'block') {
          await this.auditLog.processInput(processedMessage, {
            ...context, action: 'blocked', blockedBy: entry.name, mcpResults,
          });
          this.lastInputResults = mcpResults;
          this.notify({ type: 'block', plugin: entry.name, result });
          this.registry.runHook('afterProcess', { result, blocked: true });
          return { passed: false, blockedBy: entry.name, message: result.message, results: mcpResults };
        }

        if (result.redacted && result.redactedText) {
          processedMessage = result.redactedText;
        }
      } catch (err) {
        console.error(`MCP plugin "${entry.name}" error:`, err);
        mcpResults[entry.name] = { passed: true, error: err.message };
      }
    }

    this.lastInputResults = mcpResults;
    await this.auditLog.processInput(processedMessage, {
      ...context, action: 'allowed', mcpResults,
    });

    this.notify({ type: 'allowed', results: mcpResults });
    this.registry.runHook('afterProcess', { message: processedMessage, results: mcpResults });

    return { passed: true, message: processedMessage, results: mcpResults };
  }

  async processOutput(response, context = {}) {
    const mcpResults = {};
    const plugins = this.registry.getOutputPlugins();
    let processedResponse = response;

    for (const entry of plugins) {
      try {
        const cacheResult = await entry.plugin.processOutput(processedResponse, {
          ...context,
          sessionId: this.auditLog.sessionId,
        });

        mcpResults[entry.name] = cacheResult;

        if (cacheResult.cached && cacheResult.response) {
          processedResponse = cacheResult.response;
        }
      } catch (err) {
        console.error(`MCP output plugin "${entry.name}" error:`, err);
        mcpResults[entry.name] = { passed: true, error: err.message };
      }
    }

    this.lastOutputResults = mcpResults;
    await this.auditLog.processOutput(processedResponse, {
      ...context, mcpResults,
    });

    this.notify({ type: 'output', results: mcpResults });

    return { passed: true, response: processedResponse, results: mcpResults };
  }

  getLastResults() {
    return { input: this.lastInputResults, output: this.lastOutputResults };
  }

  getRegistry() {
    return this.registry;
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
    for (const fn of this.listeners) {
      try { fn(event); } catch (err) { console.error('MCP listener error:', err); }
    }
  }

  async autoConfigure(context = {}) {
    this.registry.autoConfigure(context);

    for (const entry of this.registry.getAll()) {
      const configKey = entry.name.replace('MCP', '').toLowerCase();
      const config = CONFIG.mcp[configKey];
      if (config && config.enabled !== undefined) {
        this.registry.setEnabled(entry.name, config.enabled);
      }
    }

    this.notify({ type: 'autoConfigured', context });
  }

  destroy() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    this.listeners = [];
  }

  getMetadata() {
    return {
      registry: this.registry.toJSON(),
      auditLog: this.auditLog.getMetadata(),
    };
  }
}
