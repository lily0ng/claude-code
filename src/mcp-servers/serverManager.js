import { MCPServer } from './mcpServer.js';
import { FileSystemServer } from './filesystemServer.js';
import { WebSearchServer } from './webSearchServer.js';
import { DatabaseServer } from './databaseServer.js';
import { SystemServer } from './systemServer.js';
import { CodeToolsServer } from './codeToolsServer.js';
import { MCPProtocol } from './protocol.js';

export class ServerManager {
  constructor() {
    this.servers = new Map();
    this.activeServer = null;
    this.listeners = [];
    this.requestHistory = [];
    this.maxHistory = 100;
    this._registerDefaults();
  }

  _registerDefaults() {
    this.register(new FileSystemServer());
    this.register(new WebSearchServer());
    this.register(new DatabaseServer());
    this.register(new SystemServer());
    this.register(new CodeToolsServer());
  }

  register(server) {
    if (!(server instanceof MCPServer)) {
      throw new Error(`Cannot register: ${server.name} is not an MCPServer instance`);
    }
    if (this.servers.has(server.name)) {
      console.warn(`Server "${server.name}" already registered, skipping`);
      return;
    }
    this.servers.set(server.name, {
      server,
      status: 'stopped',
      startedAt: null,
      errorCount: 0,
    });
    this.notify({ type: 'serverRegistered', name: server.name });
  }

  unregister(name) {
    const entry = this.servers.get(name);
    if (!entry) return false;
    if (entry.status === 'running') this.stop(name);
    this.servers.delete(name);
    if (this.activeServer === name) this.activeServer = null;
    this.notify({ type: 'serverUnregistered', name });
    return true;
  }

  async start(name) {
    const entry = this.servers.get(name);
    if (!entry) throw new Error(`Server not found: ${name}`);
    if (entry.status === 'running') return;

    try {
      const req = MCPProtocol.createRequest('initialize', {
        clientInfo: { name: 'AI-Platform', version: '1.0.0' },
      });
      const resp = await entry.server.handleRequest(req);

      if (resp?.error) throw new Error(resp.error.message);

      entry.status = 'running';
      entry.startedAt = new Date().toISOString();
      entry.errorCount = 0;

      const notif = MCPProtocol.createRequest('notifications/initialized');
      await entry.server.handleRequest(notif);

      this.activeServer = name;
      this.notify({ type: 'serverStarted', name });
    } catch (err) {
      entry.status = 'error';
      entry.errorCount++;
      this.notify({ type: 'serverError', name, error: err.message });
      throw err;
    }
  }

  stop(name) {
    const entry = this.servers.get(name);
    if (!entry) return;
    entry.status = 'stopped';
    entry.startedAt = null;
    if (this.activeServer === name) this.activeServer = null;
    this.notify({ type: 'serverStopped', name });
  }

  restart(name) {
    this.stop(name);
    return this.start(name);
  }

  getServer(name) {
    return this.servers.get(name)?.server || null;
  }

  getEntry(name) {
    return this.servers.get(name) || null;
  }

  getAll() {
    return Array.from(this.servers.entries()).map(([name, entry]) => ({
      name,
      ...entry.server.toJSON(),
      status: entry.status,
      startedAt: entry.startedAt,
      errorCount: entry.errorCount,
    }));
  }

  getRunning() {
    return this.getAll().filter(s => s.status === 'running');
  }

  getTools(name) {
    const server = this.getServer(name);
    return server ? server.getToolList() : [];
  }

  getResources(name) {
    const server = this.getServer(name);
    return server ? server.getResourceList() : [];
  }

  async callTool(serverName, toolName, args = {}) {
    const entry = this.servers.get(serverName);
    if (!entry) throw new Error(`Server not found: ${serverName}`);
    if (entry.status !== 'running') throw new Error(`Server "${serverName}" is not running`);

    const req = MCPProtocol.createRequest('tools/call', { name: toolName, arguments: args });
    const resp = await entry.server.handleRequest(req);

    this.requestHistory.push({
      timestamp: new Date().toISOString(),
      server: serverName,
      tool: toolName,
      args,
      response: resp,
    });
    if (this.requestHistory.length > this.maxHistory) this.requestHistory.shift();

    if (resp?.error) {
      this.notify({ type: 'toolError', server: serverName, tool: toolName, error: resp.error.message });
      throw new Error(resp.error.message);
    }

    this.notify({ type: 'toolCalled', server: serverName, tool: toolName });
    return resp?.result || resp;
  }

  async callToolFromChat(serverName, toolName, args = {}) {
    const result = await this.callTool(serverName, toolName, args);
    const content = result?.content || [];
    return content.map(c => c.text || JSON.stringify(c)).join('\n');
  }

  getHistory() {
    return [...this.requestHistory];
  }

  getAllToolNames() {
    const tools = [];
    for (const [name] of this.servers) {
      const serverTools = this.getTools(name);
      for (const tool of serverTools) {
        tools.push({ server: name, ...tool });
      }
    }
    return tools;
  }

  startAll() {
    return Promise.allSettled(
      Array.from(this.servers.keys()).map(name => this.start(name).catch(() => {}))
    );
  }

  stopAll() {
    for (const name of this.servers.keys()) this.stop(name);
  }

  onChange(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  notify(event) {
    for (const fn of this.listeners) {
      try { fn(event); } catch (err) { console.error('ServerManager listener error:', err); }
    }
  }

  toJSON() {
    return {
      serverCount: this.servers.size,
      activeServer: this.activeServer,
      servers: this.getAll(),
    };
  }
}
