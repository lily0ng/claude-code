import { BaseProvider } from './baseProvider.js';
import { getApiKey, CONFIG } from '../config.js';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super(CONFIG.providers.openai);
  }

  getApiKey() {
    return getApiKey('openai');
  }

  buildHeaders() {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API key not found. Set OPENAI_API_KEY or save via settings.');
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  buildRequestBody(model, messages, options = {}) {
    const body = {
      model: model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
    };
    if (options.stream) body.stream = true;
    if (options.stop) body.stop = options.stop;
    return body;
  }

  parseResponse(data) {
    const choice = data?.choices?.[0];
    if (!choice) throw new Error('Invalid response: no choices returned');
    return {
      content: choice.message?.content || '',
      role: choice.message?.role || 'assistant',
      model: data.model,
      usage: data.usage || null,
      finishReason: choice.finish_reason || null,
    };
  }

  parseStreamChunk(chunk) {
    return chunk?.choices?.[0]?.delta?.content || '';
  }

  async listModels() {
    const headers = this.buildHeaders();
    const response = await fetch('https://api.openai.com/v1/models', { headers });
    if (!response.ok) throw new Error(`Failed to list models: ${response.status}`);
    const data = await response.json();
    return data.data
      .filter(m => m.id.startsWith('gpt'))
      .map(m => ({ id: m.id, ownedBy: m.owned_by, created: m.created }))
      .sort((a, b) => b.created - a.created);
  }
}
