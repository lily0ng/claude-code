export class BaseProvider {
  constructor(config) {
    if (new.target === BaseProvider) {
      throw new TypeError('BaseProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = config.name;
    this.models = config.models;
    this.defaultModel = config.defaultModel;
    this.endpoint = config.endpoint;
    this.retries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
  }

  getApiKey() {
    throw new Error('getApiKey() must be implemented by subclass');
  }

  buildHeaders() {
    throw new Error('buildHeaders() must be implemented by subclass');
  }

  buildRequestBody(model, messages, options) {
    throw new Error('buildRequestBody() must be implemented by subclass');
  }

  parseResponse(data) {
    throw new Error('parseResponse() must be implemented by subclass');
  }

  parseError(error) {
    return error?.message || 'Unknown error occurred';
  }

  getEndpoint() {
    return this.endpoint;
  }

  async request(model, messages, options = {}) {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(model, messages, options);
    const endpoint = options.endpoint || this.getEndpoint();
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

  isRetryable(error) {
    const status = error.status;
    if (!status) return true;
    return status === 429 || status >= 500;
  }

  async stream(model, messages, options = {}) {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(model, messages, { ...options, stream: true });
    const endpoint = options.endpoint || this.getEndpoint();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const externalSignal = options.signal;

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { ...headers, ...options.headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Stream HTTP ${response.status}: ${errBody || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            return { done: true, value: null };
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return { done: true, value: null };

            try {
              const parsed = JSON.parse(data);
              const content = this.parseStreamChunk(parsed);
              if (content) {
                return { done: false, value: content };
              }
            } catch {
              continue;
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

  parseStreamChunk(chunk) {
    return chunk?.choices?.[0]?.delta?.content || '';
  }
}
