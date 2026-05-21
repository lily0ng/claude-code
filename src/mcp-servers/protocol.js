export class MCPProtocol {
  static createRequest(method, params = {}, id = null) {
    return {
      jsonrpc: '2.0',
      id: id || Date.now(),
      method,
      params,
    };
  }

  static createResponse(id, result) {
    return { jsonrpc: '2.0', id, result };
  }

  static createError(id, code, message, data = null) {
    const error = { code, message };
    if (data) error.data = data;
    return { jsonrpc: '2.0', id, error };
  }

  static parse(message) {
    if (typeof message === 'string') {
      try { message = JSON.parse(message); }
      catch { return null; }
    }
    if (!message || message.jsonrpc !== '2.0') return null;
    if (message.method && message.params !== undefined) {
      return { type: 'request', id: message.id, method: message.method, params: message.params };
    }
    if (message.result !== undefined && message.id !== undefined) {
      return { type: 'response', id: message.id, result: message.result };
    }
    if (message.error && message.id !== undefined) {
      return { type: 'error', id: message.id, error: message.error };
    }
    return null;
  }

  static isNotification(message) {
    return message && message.jsonrpc === '2.0' && message.method && message.id === undefined;
  }

  static errorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    TOOL_NOT_FOUND: -32000,
    TOOL_EXECUTION_ERROR: -32001,
    RESOURCE_NOT_FOUND: -32002,
    SERVER_NOT_INITIALIZED: -32003,
  };

  static get toolsList() { return 'tools/list'; }
  static get toolsCall() { return 'tools/call'; }
  static get resourcesList() { return 'resources/list'; }
  static get resourcesRead() { return 'resources/read'; }
  static get promptsList() { return 'prompts/list'; }
  static get promptsGet() { return 'prompts/get'; }
  static get initialize() { return 'initialize'; }
}

export class MCPCapabilities {
  constructor() {
    this.tools = {};
    this.resources = {};
    this.prompts = {};
  }

  addTool(name, description, inputSchema, handler) {
    this.tools[name] = { name, description, inputSchema, handler };
  }

  addResource(uri, name, description, handler) {
    this.resources[uri] = { uri, name, description, handler };
  }

  addPrompt(name, description, argumentsSchema, handler) {
    this.prompts[name] = { name, description, arguments: argumentsSchema || [], handler };
  }

  getToolList() {
    return Object.values(this.tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  getResourceList() {
    return Object.values(this.resources).map(r => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
    }));
  }

  getPromptList() {
    return Object.values(this.prompts).map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
  }

  executeTool(name, args) {
    const tool = this.tools[name];
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool.handler(args);
  }

  readResource(uri) {
    const resource = this.resources[uri];
    if (!resource) throw new Error(`Resource not found: ${uri}`);
    return resource.handler();
  }

  getPrompt(name, args = {}) {
    const prompt = this.prompts[name];
    if (!prompt) throw new Error(`Prompt not found: ${name}`);
    return prompt.handler(args);
  }
}
