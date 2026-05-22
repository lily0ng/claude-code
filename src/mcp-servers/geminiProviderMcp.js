import { MCPServer } from './mcpServer.js';
import { GoogleProvider } from '../../providers/googleProvider.js';

export class GeminiProviderMcp extends MCPServer {
  constructor() {
    super({
      name: 'GeminiProvider',
      version: '1.0.0',
      description: 'Gemini AI model provider - generate content, analyze, and process through Gemini APIs',
    });
    this.provider = new GoogleProvider();
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('gemini_generate', 'Generate text using Gemini models', {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Input prompt for generation' },
        model: {
          type: 'string',
          description: 'Gemini model to use',
          enum: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro'],
          default: 'gemini-2.0-flash',
        },
        temperature: { type: 'number', description: 'Sampling temperature (0-2)', default: 0.7 },
        maxTokens: { type: 'number', description: 'Maximum output tokens', default: 4096 },
      },
      required: ['prompt'],
    }, async (args) => {
      try {
        const messages = [{ role: 'user', content: args.prompt }];
        const result = await this.provider.request(args.model || 'gemini-2.0-flash', messages, {
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
        return { content: [{ type: 'text', text: `Gemini generation failed: ${err.message}` }] };
      }
    });

    this.addTool('gemini_analyze_safety', 'Analyze content safety using Gemini safety ratings', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze for safety' },
      },
      required: ['text'],
    }, async (args) => {
      try {
        const messages = [{ role: 'user', content: `Analyze the safety of this content: ${args.text}` }];
        const result = await this.provider.request('gemini-1.5-flash', messages, {
          temperature: 0.1,
          maxTokens: 1024,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: { safetyRatings: result.safetyRatings || [] },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Safety analysis failed: ${err.message}` }] };
      }
    });

    this.addTool('gemini_vision', 'Analyze an image using Gemini vision capabilities', {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the image to analyze' },
        prompt: { type: 'string', description: 'Question about the image', default: 'Describe this image in detail' },
        model: {
          type: 'string',
          description: 'Gemini model (must support vision)',
          default: 'gemini-2.0-flash',
        },
      },
      required: ['imageUrl'],
    }, async (args) => {
      try {
        const messages = [{
          role: 'user',
          content: [
            { type: 'text', text: args.prompt },
            { type: 'image_url', image_url: { url: args.imageUrl } },
          ],
        }];
        const result = await this.provider.request(args.model || 'gemini-2.0-flash', messages, {
          temperature: 0.4,
          maxTokens: 4096,
        });
        return {
          content: [{ type: 'text', text: result.content }],
          meta: { model: result.model },
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Image analysis failed: ${err.message}` }] };
      }
    });

    this.addTool('gemini_list_models', 'List available Gemini models', {
      type: 'object',
      properties: {},
    }, async () => {
      const models = [
        { id: 'gemini-2.0-flash', description: 'Fast, versatile model for everyday tasks' },
        { id: 'gemini-2.0-pro', description: 'Enhanced capabilities for complex tasks' },
        { id: 'gemini-1.5-pro', description: 'Previous gen high-performance model' },
        { id: 'gemini-1.5-flash', description: 'Previous gen fast and efficient model' },
        { id: 'gemini-2.5-pro', description: 'Latest flagship model with advanced reasoning' },
      ];
      return {
        content: [{ type: 'text', text: models.map(m => `- ${m.id}: ${m.description}`).join('\n') }],
      };
    });
  }

  _registerResources() {
    this.addResource('gemini://info', 'Gemini Provider Info', 'Gemini provider configuration and status', () => ({
      contents: [{
        uri: 'gemini://info',
        text: JSON.stringify({
          provider: 'Google Gemini',
          defaultModel: 'gemini-2.0-flash',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta',
          available: !!this.provider.getApiKey(),
        }, null, 2),
      }],
    }));
  }
}
