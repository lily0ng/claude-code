import { MCPServer } from './mcpServer.js';
import { OpenAIProvider } from '../../providers/openaiProvider.js';

export class OpenAIProviderMcp extends MCPServer {
  constructor() {
    super({
      name: 'OpenAIProvider',
      version: '1.0.0',
      description: 'OpenAI model provider - generate text, list models, and query through OpenAI APIs',
    });
    this.provider = new OpenAIProvider();
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('openai_generate', 'Generate text using OpenAI models', {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Input prompt for generation' },
        model: {
          type: 'string',
          description: 'OpenAI model to use',
          default: 'gpt-4o',
        },
        temperature: { type: 'number', description: 'Sampling temperature (0-2)', default: 0.7 },
        maxTokens: { type: 'number', description: 'Maximum output tokens', default: 4096 },
        systemPrompt: { type: 'string', description: 'System prompt to set context' },
      },
      required: ['prompt'],
    }, async (args) => {
      try {
        const messages = [];
        if (args.systemPrompt) {
          messages.push({ role: 'system', content: args.systemPrompt });
        }
        messages.push({ role: 'user', content: args.prompt });
        const result = await this.provider.request(args.model || 'gpt-4o', messages, {
          temperature: args.temperature ?? 0.7,
          maxTokens: args.maxTokens ?? 4096,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: {
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason,
          },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `OpenAI generation failed: ${err.message}` }] };
      }
    });

    this.addTool('openai_list_models', 'List available OpenAI GPT models', {
      type: 'object',
      properties: {},
    }, async () => {
      try {
        const models = await this.provider.listModels();
        return {
          content: [{
            type: 'text',
            text: models.map(m => `- ${m.id}`).join('\n'),
          }],
          meta: { count: models.length },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list models: ${err.message}` }] };
      }
    });

    this.addTool('openai_chat', 'Chat with an OpenAI model with full conversation history', {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
          description: 'Array of conversation messages',
        },
        model: { type: 'string', description: 'Model to use', default: 'gpt-4o' },
        temperature: { type: 'number', description: 'Temperature', default: 0.7 },
      },
      required: ['messages'],
    }, async (args) => {
      try {
        const result = await this.provider.request(args.model || 'gpt-4o', args.messages, {
          temperature: args.temperature ?? 0.7,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: { usage: result.usage, model: result.model },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Chat failed: ${err.message}` }] };
      }
    });
  }

  _registerResources() {
    this.addResource('openai://info', 'OpenAI Provider Info', 'OpenAI provider configuration and status', () => ({
      contents: [{
        uri: 'openai://info',
        text: JSON.stringify({
          provider: 'OpenAI',
          defaultModel: 'gpt-4o',
          endpoint: 'https://api.openai.com/v1',
          available: !!this.provider.getApiKey(),
        }, null, 2),
      }],
    }));
  }
}
