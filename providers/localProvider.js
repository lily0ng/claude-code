import { BaseProvider } from './baseProvider.js';
import { CONFIG } from '../config.js';

export class LocalProvider extends BaseProvider {
  constructor() {
    super(CONFIG.providers.local);
    this.endpoints = CONFIG.providers.local.endpoints;
    this.activeEndpoint = null;
  }

  getApiKey() {
    return null;
  }

  buildHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  getEndpoint() {
    return this.activeEndpoint || this.endpoints.ollama;
  }

  setEndpoint(type) {
    if (this.endpoints[type]) {
      this.activeEndpoint = this.endpoints[type];
    }
  }

  buildRequestBody(model, messages, options = {}) {
    const isOllama = this.activeEndpoint?.includes('11434');

    if (isOllama) {
      return {
        model: model || this.defaultModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: options.stream || false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 4096,
          top_p: options.topP ?? 1,
          stop: options.stop || [],
        },
      };
    }

    return {
      model: model || this.defaultModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1,
      stream: options.stream || false,
    };
  }

  parseResponse(data) {
    const isOllama = this.activeEndpoint?.includes('11434');

    if (isOllama) {
      return {
        content: data.message?.content || data.response || '',
        role: 'assistant',
        model: data.model,
        usage: data.total_duration ? {
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
          promptEvalCount: data.prompt_eval_count,
          evalCount: data.eval_count,
        } : null,
        done: data.done,
      };
    }

    const choice = data?.choices?.[0];
    return {
      content: choice?.message?.content || choice?.text || '',
      role: choice?.message?.role || 'assistant',
      model: data.model,
      usage: data.usage || null,
      finishReason: choice?.finish_reason || null,
    };
  }

  async listLocalModels() {
    const models = [];

    try {
      const ollamaResp = await fetch(`${this.endpoints.ollama}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (ollamaResp.ok) {
        const data = await ollamaResp.json();
        for (const m of (data.models || [])) {
          models.push({
            id: m.name,
            provider: 'ollama',
            size: m.size,
            modifiedAt: m.modified_at,
            details: m.details,
          });
        }
      }
    } catch {
      // Ollama not reachable
    }

    try {
      const lmResp = await fetch(`${this.endpoints.lmStudio}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (lmResp.ok) {
        const data = await lmResp.json();
        for (const m of (data.data || [])) {
          models.push({
            id: m.id,
            provider: 'lm-studio',
            ownedBy: m.owned_by || 'local',
          });
        }
      }
    } catch {
      // LM Studio not reachable
    }

    return models;
  }

  async checkHealth() {
    const status = {};
    for (const [name, url] of Object.entries(this.endpoints)) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(2000) });
        status[name] = { online: resp.ok, statusCode: resp.status };
      } catch {
        status[name] = { online: false, statusCode: null };
      }
    }
    return status;
  }
}
