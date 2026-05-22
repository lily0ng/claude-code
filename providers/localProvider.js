import { BaseProvider } from './baseProvider.js';
import { CONFIG } from '../config.js';

export class LocalProvider extends BaseProvider {
  constructor() {
    super(CONFIG.providers.local);
    this.endpoints = CONFIG.providers.local.endpoints;
    this.activeEndpoint = null;
    this.activeEndpointType = 'ollama';
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
      this.activeEndpointType = type;
    }
  }

  getBaseEndpoint() {
    return this.activeEndpoint || this.endpoints.ollama;
  }

  getActiveEndpointType() {
    return this.activeEndpointType;
  }

  buildRequestBody(model, messages, options = {}) {
    const body = {
      model: model || this.defaultModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 8192,
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

  async request(model, messages, options = {}) {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(model, messages, options);
    const endpoint = this.getEndpoint();
    let lastError;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: { ...headers, ...options.headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${errBody || response.statusText}`);
        }

        const data = await response.json();
        return this.parseResponse(data);
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (attempt < this.retries && this.isRetryable(err)) {
          await new Promise(r => setTimeout(r, this.retryDelay * (attempt + 1)));
          continue;
        }
        break;
      }
    }
    throw new Error(this.parseError(lastError));
  }

  async stream(model, messages, options = {}) {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(model, messages, { ...options, stream: true });
    const endpoint = this.getEndpoint();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const externalSignal = options.signal;

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response;
    try {
      response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { ...headers, ...options.headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Connection failed: ${err.message}. Make sure Ollama or LM Studio is running.`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 404) {
        throw new Error(`Model "${model}" not found. Pull it first with: ollama pull ${model}`);
      }
      throw new Error(`Stream HTTP ${response.status}: ${errBody || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isOllamaNative = this.activeEndpointType === 'ollama';

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        while (true) {
          let readResult;
          try {
            readResult = await reader.read();
          } catch (err) {
            return { done: true, value: null };
          }
          const { done, value } = readResult;
          if (done) {
            return { done: true, value: null };
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed === 'data: [DONE]') return { done: true, value: null };

            let parsed;
            let dataStr = trimmed;

            if (dataStr.startsWith('data: ')) {
              dataStr = dataStr.slice(6);
            }

            try {
              parsed = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (parsed.error) {
              throw new Error(parsed.error.message || 'Stream error');
            }

            if (isOllamaNative && parsed.message?.content) {
              return { done: false, value: parsed.message.content };
            }

            const content = parsed?.choices?.[0]?.delta?.content ||
                            parsed?.choices?.[0]?.text || '';
            if (content) {
              return { done: false, value: content };
            }
          }
        }
      },
      async return() {
        controller.abort();
        return { done: true, value: null };
      },
    };
  }

  async listLocalModels() {
    const models = [];

    try {
      const ollamaResp = await fetch(`${this.endpoints.ollama}/api/tags`, {
        signal: AbortSignal.timeout(5000),
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
    }

    try {
      const lmResp = await fetch(`${this.endpoints.lmStudio}/v1/models`, {
        signal: AbortSignal.timeout(5000),
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
    }

    return models;
  }

  async checkHealth() {
    const status = {};
    for (const [name, url] of Object.entries(this.endpoints)) {
      try {
        const checkUrl = name === 'ollama' ? `${url}/api/tags` : `${url}/v1/models`;
        const resp = await fetch(checkUrl, { signal: AbortSignal.timeout(3000) });
        status[name] = { online: resp.ok, statusCode: resp.status };
      } catch {
        status[name] = { online: false, statusCode: null };
      }
    }
    return status;
  }
}
