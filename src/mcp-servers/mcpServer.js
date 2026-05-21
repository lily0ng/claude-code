import { MCPProtocol, MCPCapabilities } from './protocol.js';

export class MCPServer {
  constructor(options = {}) {
    this.name = options.name || 'UnnamedServer';
    this.version = options.version || '1.0.0';
    this.description = options.description || '';
    this.capabilities = new MCPCapabilities();
    this.initialized = false;
    this.serverInfo = {
      name: this.name,
      version: this.version,
      description: this.description,
    };
    this._registerDefaults();
  }

  _registerDefaults() {
    this.capabilities.addResource('server://info', 'Server Info', 'Information about this MCP server', () => ({
      contents: [{ uri: 'server://info', text: JSON.stringify(this.serverInfo, null, 2) }],
    }));

    this.capabilities.addResource('server://capabilities', 'Capabilities', 'List of all server capabilities', () => ({
      contents: [{
        uri: 'server://capabilities',
        text: JSON.stringify({
          tools: this.capabilities.getToolList().length,
          resources: this.capabilities.getResourceList().length,
          prompts: this.capabilities.getPromptList().length,
        }, null, 2),
      }],
    }));
  }

  getToolList() {
    return this.capabilities.getToolList();
  }

  getResourceList() {
    return this.capabilities.getResourceList();
  }

  getPromptList() {
    return this.capabilities.getPromptList();
  }

  addTool(name, description, inputSchema, handler) {
    this.capabilities.addTool(name, description, inputSchema, handler);
  }

  addResource(uri, name, description, handler) {
    this.capabilities.addResource(uri, name, description, handler);
  }

  addPrompt(name, description, argumentsSchema, handler) {
    this.capabilities.addPrompt(name, description, argumentsSchema, handler);
  }

  async handleRequest(request) {
    if (!request || !request.method) {
      return MCPProtocol.createError(null, MCPProtocol.errorCodes.INVALID_REQUEST, 'Invalid request');
    }

    const { method, params, id } = request;

    if (method !== 'initialize' && !this.initialized && method !== 'notifications/initialized') {
      return MCPProtocol.createError(id, MCPProtocol.errorCodes.SERVER_NOT_INITIALIZED, 'Server not initialized');
    }

    try {
      switch (method) {
        case 'initialize':
          return this._handleInitialize(id, params);

        case 'tools/list':
          return MCPProtocol.createResponse(id, { tools: this.getToolList() });

        case 'tools/call': {
          const result = await this.capabilities.executeTool(params.name, params.arguments || {});
          return MCPProtocol.createResponse(id, { content: this._formatContent(result) });
        }

        case 'resources/list':
          return MCPProtocol.createResponse(id, { resources: this.getResourceList() });

        case 'resources/read': {
          const result = this.capabilities.readResource(params.uri);
          return MCPProtocol.createResponse(id, result);
        }

        case 'prompts/list':
          return MCPProtocol.createResponse(id, { prompts: this.getPromptList() });

        case 'prompts/get': {
          const result = this.capabilities.getPrompt(params.name, params.arguments || {});
          return MCPProtocol.createResponse(id, result);
        }

        case 'notifications/initialized':
          this.initialized = true;
          return null;

        default:
          return MCPProtocol.createError(id, MCPProtocol.errorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`);
      }
    } catch (err) {
      return MCPProtocol.createError(id, MCPProtocol.errorCodes.INTERNAL_ERROR, err.message);
    }
  }

  _handleInitialize(id, params) {
    this.initialized = true;
    const clientInfo = params?.clientInfo || {};
    return MCPProtocol.createResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true, subscribe: true },
        prompts: { listChanged: true },
      },
      serverInfo: this.serverInfo,
      clientInfo,
    });
  }

  _formatContent(result) {
    if (typeof result === 'string') {
      return [{ type: 'text', text: result }];
    }
    if (Array.isArray(result)) {
      return result;
    }
    if (result && result.content) {
      return result.content;
    }
    return [{ type: 'text', text: JSON.stringify(result, null, 2) }];
  }

  processMessage(message) {
    const parsed = MCPProtocol.parse(message);
    if (!parsed) {
      return MCPProtocol.createError(null, MCPProtocol.errorCodes.PARSE_ERROR, 'Failed to parse message');
    }
    if (parsed.type !== 'request') return null;
    return this.handleRequest(parsed);
  }

  toJSON() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      initialized: this.initialized,
      toolCount: this.getToolList().length,
      resourceCount: this.getResourceList().length,
      promptCount: this.getPromptList().length,
    };
  }
}
