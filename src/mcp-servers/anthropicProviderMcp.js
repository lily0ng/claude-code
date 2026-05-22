import { MCPServer } from './mcpServer.js';
import { AnthropicProvider } from '../../providers/anthropicProvider.js';

export class AnthropicProviderMcp extends MCPServer {
  constructor() {
    super({
      name: 'AnthropicProvider',
      version: '1.0.0',
      description: 'Anthropic Claude model provider - generate text, analyze, and process through Claude APIs',
    });
    this.provider = new AnthropicProvider();
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('claude_generate', 'Generate text using Anthropic Claude models', {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Input prompt for generation' },
        model: {
          type: 'string',
          description: 'Claude model to use',
          default: 'claude-sonnet-4-20250514',
        },
        temperature: { type: 'number', description: 'Sampling temperature (0-1)', default: 0.7 },
        maxTokens: { type: 'number', description: 'Maximum output tokens', default: 4096 },
        systemPrompt: { type: 'string', description: 'System prompt for Claude' },
      },
      required: ['prompt'],
    }, async (args) => {
      try {
        const messages = [];
        if (args.systemPrompt) {
          messages.push({ role: 'system', content: args.systemPrompt });
        }
        messages.push({ role: 'user', content: args.prompt });
        const result = await this.provider.request(args.model || 'claude-sonnet-4-20250514', messages, {
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
        return { content: [{ type: 'text', text: `Claude generation failed: ${err.message}` }] };
      }
    });

    this.addTool('claude_analyze', 'Analyze text or code using Claude with chain-of-thought reasoning', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text or code to analyze' },
        analysisType: {
          type: 'string',
          description: 'Type of analysis',
          enum: ['review', 'explain', 'improve', 'security', 'bugs'],
          default: 'review',
        },
        model: { type: 'string', description: 'Claude model', default: 'claude-sonnet-4-20250514' },
      },
      required: ['text'],
    }, async (args) => {
      try {
        const prompts = {
          review: 'Review the following content thoroughly. Identify issues, strengths, and provide recommendations:\n\n',
          explain: 'Explain the following in detail, covering concepts and context:\n\n',
          improve: 'Analyze and suggest improvements for the following. Be specific and actionable:\n\n',
          security: 'Perform a security analysis of the following. Identify vulnerabilities and risks:\n\n',
          bugs: 'Analyze the following for bugs, errors, and logical issues. Be thorough:\n\n',
        };
        const systemPrompt = 'You are an expert analyst. Provide detailed, well-structured analysis.';
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: (prompts[args.analysisType] || prompts.review) + args.text },
        ];
        const result = await this.provider.request(args.model || 'claude-sonnet-4-20250514', messages, {
          temperature: 0.3,
          maxTokens: 8192,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: { analysisType: args.analysisType, model: result.model },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Analysis failed: ${err.message}` }] };
      }
    });

    this.addTool('claude_chat', 'Chat with Claude using full conversation history', {
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
        model: { type: 'string', description: 'Claude model', default: 'claude-sonnet-4-20250514' },
        maxTokens: { type: 'number', description: 'Max tokens', default: 4096 },
      },
      required: ['messages'],
    }, async (args) => {
      try {
        const result = await this.provider.request(args.model || 'claude-sonnet-4-20250514', args.messages, {
          maxTokens: args.maxTokens ?? 4096,
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
    this.addResource('anthropic://info', 'Anthropic Provider Info', 'Anthropic provider configuration and status', () => ({
      contents: [{
        uri: 'anthropic://info',
        text: JSON.stringify({
          provider: 'Anthropic Claude',
          defaultModel: 'claude-sonnet-4-20250514',
          endpoint: 'https://api.anthropic.com/v1',
          available: !!this.provider.getApiKey(),
        }, null, 2),
      }],
    }));
  }
}
