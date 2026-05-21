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
    const base = this.activeEndpoint || this.endpoints.ollama;
    return `${base}/v1`;
  }

  setEndpoint(type) {
    if (this.endpoints[type]) {
      this.activeEndpoint = this.endpoints[type];
    }
  }

  getBaseEndpoint() {
    return this.activeEndpoint || this.endpoints.ollama;
  }

  buildRequestBody(model, messages, options = {}) {
    const body = {
      model: model || this.defaultModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1,
      stream: options.stream || false,
    };
    if (options.stop) body.stop = Array.isArray(options.stop) ? options.stop : [options.stop];
    return body;
  }

  parseResponse(data) {
    const choice = data?.choices?.[0];
    if (!choice) {
      if (data.message?.content) {
        return {
          content: data.message.content,
          role: data.message.role || 'assistant',
          model: data.model,
          done: data.done,
        };
      }
      throw new Error('Invalid local provider response');
    }
    return {
      content: choice.message?.content || choice.text || '',
      role: choice.message?.role || 'assistant',
      model: data.model,
      usage: data.usage || null,
      finishReason: choice.finish_reason || null,
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
          const details = m.details || {};
          models.push({
            id: m.name,
            provider: 'ollama',
            source: 'Ollama',
            size: m.size,
            sizeBytes: m.size,
            modifiedAt: m.modified_at,
            details: {
              family: details.family || 'unknown',
              parameterSize: details.parameter_size || 'unknown',
              quantizationLevel: details.quantization_level || 'unknown',
            },
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
            source: 'LM Studio',
            sizeBytes: m.size || 0,
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
        const checkUrl = name === 'ollama' ? `${url}/api/tags` : `${url}/v1/models`;
        const resp = await fetch(checkUrl, { signal: AbortSignal.timeout(2000) });
        status[name] = { online: resp.ok, statusCode: resp.status };
      } catch {
        status[name] = { online: false, statusCode: null };
      }
    }
    return status;
  }
}
