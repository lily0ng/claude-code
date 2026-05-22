import { BaseProvider } from './baseProvider.js';
import { getApiKey, CONFIG } from '../config.js';

export class GoogleProvider extends BaseProvider {
  constructor() {
    super(CONFIG.providers.google);
  }

  getApiKey() {
    return getApiKey('google');
  }

  buildHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  getEndpoint() {
    return this.endpoint;
  }

  getModelEndpoint(model, stream = false) {
    const modelId = model || this.defaultModel;
    const alt = stream ? 'streamGenerateContent' : 'generateContent';
    return `${this.endpoint}/models/${modelId}:${alt}?key=${this.getApiKey()}`;
  }

  buildRequestBody(model, messages, options = {}) {
    const contents = [];
    const systemMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg.content);
      } else if (typeof msg.content === 'string') {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      } else if (Array.isArray(msg.content)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: msg.content.map(p => {
            if (p.type === 'text') return { text: p.text };
            if (p.type === 'image_url') return { inlineData: { mimeType: 'image/jpeg', data: p.image_url?.url || '' } };
            return { text: JSON.stringify(p) };
          }),
        });
      }
    }

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 8192,
        topP: options.topP ?? 1,
        topK: options.topK ?? 40,
      },
    };

    if (systemMessages.length > 0) {
      body.systemInstruction = { parts: [{ text: systemMessages.join('\n') }] };
    }
    if (options.stop) body.generationConfig.stopSequences = Array.isArray(options.stop) ? options.stop : [options.stop];

    return body;
  }

  parseResponse(data) {
    const candidate = data?.candidates?.[0];
    if (!candidate) throw new Error('Invalid Gemini response: no candidates');

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Gemini generation stopped: ${candidate.finishReason}`);
    }

    const text = candidate.content?.parts?.map(p => p.text).join('') || '';
    return {
      content: text,
      role: 'assistant',
      model: data.modelVersion || 'unknown',
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        candidatesTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : null,
      finishReason: candidate.finishReason || null,
      safetyRatings: candidate.safetyRatings || [],
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

        const response = await fetch(this.getModelEndpoint(model), {
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
        if (data.error) throw new Error(data.error.message || 'Gemini API error');

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
    const body = this.buildRequestBody(model, messages, { ...options, stream: false });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const externalSignal = options.signal;
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const response = await fetch(this.getModelEndpoint(model, true), {
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
            if (!trimmed) continue;
            if (trimmed === 'data: [DONE]') return { done: true, value: null };

            const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) return { done: false, value: text };
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
