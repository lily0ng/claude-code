import { BaseProvider } from './baseProvider.js';
import { getApiKey, CONFIG } from '../config.js';

export class AnthropicProvider extends BaseProvider {
  constructor() {
    super(CONFIG.providers.anthropic);
  }

  getApiKey() {
    return getApiKey('anthropic');
  }

  buildHeaders() {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY or save via settings.');
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  getEndpoint() {
    return `${this.endpoint}/messages`;
  }

  buildRequestBody(model, messages, options = {}) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const body = {
      model: model || this.defaultModel,
      messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };
    if (systemMessages.length > 0) {
      body.system = systemMessages.map(m => m.content).join('\n');
    }
    if (options.stream) body.stream = true;
    if (options.topP) body.top_p = options.topP;
    if (options.stop) body.stop_sequences = Array.isArray(options.stop) ? options.stop : [options.stop];
    return body;
  }

  parseResponse(data) {
    if (!data?.content?.[0]) throw new Error('Invalid Anthropic response');
    return {
      content: data.content[0].text || '',
      role: 'assistant',
      model: data.model,
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : null,
      finishReason: data.stop_reason || null,
    };
  }

  async request(model, messages, options = {}) {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(model, messages, options);
    let lastError;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.getEndpoint(), {
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
        if (err.name === 'AbortError') throw new Error('Request timed out');
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const externalSignal = options.signal;
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const response = await fetch(this.getEndpoint(), {
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
          if (done) return { done: true, value: null };

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') return { done: true, value: null };

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                return { done: false, value: parsed.delta.text };
              }
              if (parsed.type === 'message_start' && parsed.message?.content?.[0]?.text) {
                return { done: false, value: parsed.message.content[0].text };
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
}
