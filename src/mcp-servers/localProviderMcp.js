import { MCPServer } from './mcpServer.js';
import { LocalProvider } from '../../providers/localProvider.js';

export class LocalProviderMcp extends MCPServer {
  constructor() {
    super({
      name: 'LocalProvider',
      version: '1.0.0',
      description: 'Local AI model provider (Ollama/LM Studio) - run models locally without API keys',
    });
    this.provider = new LocalProvider();
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('local_generate', 'Generate text using a local model from Ollama or LM Studio', {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Input prompt for generation' },
        model: { type: 'string', description: 'Local model name (e.g., llama3.2, mistral, codellama)' },
        temperature: { type: 'number', description: 'Sampling temperature (0-2)', default: 0.7 },
        maxTokens: { type: 'number', description: 'Maximum output tokens', default: 4096 },
        source: {
          type: 'string',
          description: 'Local provider source',
          enum: ['ollama', 'lmStudio'],
          default: 'ollama',
        },
      },
      required: ['prompt'],
    }, async (args) => {
      try {
        this.provider.setEndpoint(args.source || 'ollama');
        const model = args.model || this.provider.defaultModel;
        const messages = [{ role: 'user', content: args.prompt }];
        const result = await this.provider.request(model, messages, {
          temperature: args.temperature ?? 0.7,
          maxTokens: args.maxTokens ?? 4096,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: {
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason,
            source: args.source || 'ollama',
          },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Local generation failed: ${err.message}` }] };
      }
    });

    this.addTool('local_list_models', 'List available models from local providers', {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Filter by provider source',
          enum: ['ollama', 'lmStudio', 'all'],
          default: 'all',
        },
      },
    }, async (args) => {
      try {
        const models = await this.provider.listLocalModels();
        let filtered = models;
        if (args.source && args.source !== 'all') {
          filtered = models.filter(m => m.provider === args.source);
        }
        if (filtered.length === 0) {
          return {
            content: [{ type: 'text', text: 'No local models found. Make sure Ollama or LM Studio is running.' }],
          };
        }
        const grouped = {};
        for (const m of filtered) {
          if (!grouped[m.source]) grouped[m.source] = [];
          grouped[m.source].push(m);
        }
        const text = Object.entries(grouped).map(([source, ms]) => {
          return `## ${source}\n${ms.map(m => {
            const details = [];
            if (m.size) details.push(`Size: ${m.size}`);
            if (m.details?.parameterSize) details.push(`Params: ${m.details.parameterSize}`);
            if (m.details?.quantizationLevel) details.push(`Quant: ${m.details.quantizationLevel}`);
            return `  - ${m.id}${details.length ? ` (${details.join(', ')})` : ''}`;
          }).join('\n')}`;
        }).join('\n\n');
        return {
          content: [{ type: 'text', text }],
          meta: { count: filtered.length, sources: Object.keys(grouped) },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Failed to list models: ${err.message}` }] };
      }
    });

    this.addTool('local_health', 'Check health status of local providers', {
      type: 'object',
      properties: {},
    }, async () => {
      try {
        const status = await this.provider.checkHealth();
        const text = Object.entries(status).map(([name, s]) => {
          return `${name}: ${s.online ? 'Online' : 'Offline'}${s.statusCode ? ` (HTTP ${s.statusCode})` : ''}`;
        }).join('\n');
        const allOffline = Object.values(status).every(s => !s.online);
        return {
          content: [{ type: 'text', text: allOffline ? 'All local providers are offline.\n' + text : text }],
          meta: { status, allOffline },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Health check failed: ${err.message}` }] };
      }
    });

    this.addTool('local_chat', 'Chat with a local model using full conversation history', {
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
        model: { type: 'string', description: 'Local model name' },
        source: { type: 'string', description: 'Local provider', enum: ['ollama', 'lmStudio'], default: 'ollama' },
        temperature: { type: 'number', description: 'Temperature', default: 0.7 },
      },
      required: ['messages'],
    }, async (args) => {
      try {
        this.provider.setEndpoint(args.source || 'ollama');
        const result = await this.provider.request(args.model || this.provider.defaultModel, args.messages, {
          temperature: args.temperature ?? 0.7,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: { model: result.model, source: args.source || 'ollama' },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Chat failed: ${err.message}` }] };
      }
    });
  }

  _registerResources() {
    this.addResource('local://status', 'Local Provider Status', 'Status of all local AI providers', () => ({
      contents: [{
        uri: 'local://status',
        text: JSON.stringify({
          provider: 'Local AI',
          endpoints: {
            ollama: 'http://localhost:11434',
            lmStudio: 'http://localhost:1234',
          },
          defaultModel: this.provider.defaultModel,
        }, null, 2),
      }],
    }));
  }
}
