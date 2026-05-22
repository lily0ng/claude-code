import { ThemeManager } from './themes/themeManager.js';
import { CONFIG, getApiKey, setApiKey } from './config.js';
import { MCPPipeline } from './mcp/mcpPipeline.js';
import { LocalModelScanner } from './localScanner.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { AnthropicProvider } from './providers/anthropicProvider.js';
import { GoogleProvider } from './providers/googleProvider.js';
import { LocalProvider } from './providers/localProvider.js';
import { ServerManager } from './src/mcp-servers/serverManager.js';

class AIApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.mcpPipeline = new MCPPipeline();
    this.serverManager = new ServerManager();
    this.localScanner = new LocalModelScanner();
    this.providers = {
      openai: new OpenAIProvider(),
      anthropic: new AnthropicProvider(),
      google: new GoogleProvider(),
      local: new LocalProvider(),
    };
    this.currentProvider = 'openai';
    this.currentModel = null;
    this.conversations = this.loadConversations();
    this.activeConversationId = null;
    this.messageHistory = [];
    this.abortController = null;
    this.isGenerating = false;
    this.editingMessageIndex = -1;
    this.lastMCPResults = null;

    // charts/history for right sidebar
    this.cpuHistory = Array(30).fill(0);
    this.memHistory = Array(30).fill(0);
    this.reqHistory = Array(60).fill(0);
    this.charts = { cpu: null, mem: null, req: null };

    this.init();
  }

  init() {
    try {
      this.cacheDom();
      console.log('[AI] cacheDom OK');
      this.bindEvents();
      console.log('[AI] bindEvents OK');
      this.syncThemeSelector();
      console.log('[AI] syncThemeSelector OK');
      this.populateProviderSelector();
      console.log('[AI] populateProviderSelector OK');
      this.populateModelSelector();
      console.log('[AI] populateModelSelector OK');
      this.loadConversationList();
      console.log('[AI] loadConversationList OK');
      this.promptForApiKeys();
      console.log('[AI] promptForApiKeys OK');
      this.registerMCPListener();
      console.log('[AI] registerMCPListener OK');
      this.registerServerListener();
      console.log('[AI] registerServerListener OK');
      this.registerLocalScanListener();
      console.log('[AI] registerLocalScanListener OK');
      this.scanLocalModels();
      console.log('[AI] scanLocalModels OK');
      this.showWelcome();
      console.log('[AI] showWelcome OK');
      this.autoConfigureMCP();
      console.log('[AI] autoConfigureMCP OK');
      this.initServers();
      console.log('[AI] initServers OK');
      // create charts and start system metrics polling for right-sidebar
      try { this.createCharts(); console.log('[AI] createCharts OK'); } catch(e){ console.warn('createCharts failed', e); }
      try { this.startSystemMetrics(); console.log('[AI] startSystemMetrics OK'); } catch(e){ console.warn('startSystemMetrics failed', e); }
    } catch (err) {
      console.error('[AI] Init failed at step:', err.message);
      console.error('[AI] Stack:', err.stack);
    }
  }

  cacheDom() {
    this.elements = {
      providerSelect: document.getElementById('provider-select'),
      modelSelect: document.getElementById('model-select'),
      modelFavBtn: document.getElementById('model-fav-btn'),
      modelInfo: document.getElementById('model-info'),
      modelInfoText: document.getElementById('model-info-text'),
      modelCapsDisplay: document.getElementById('model-caps-display'),
      modelDetailsPopup: document.getElementById('model-details-popup'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      sendBtn: document.getElementById('send-btn'),
      stopBtn: document.getElementById('stop-btn'),
      themeSelect: document.getElementById('theme-select'),
      settingsBtn: document.getElementById('settings-btn'),
      settingsModal: document.getElementById('settings-modal'),
      settingsPanel: document.getElementById('settings-panel'),
      closeSettings: document.getElementById('close-settings'),
      apiKeyInputs: document.getElementById('api-key-inputs'),
      saveKeysBtn: document.getElementById('save-keys-btn'),
      newChatBtn: document.getElementById('new-chat-btn'),
      conversationList: document.getElementById('conversation-list'),
      mcpStatus: document.getElementById('mcp-status'),
      localModelsBtn: document.getElementById('local-models-btn'),
      localModelsPanel: document.getElementById('local-models-panel'),
      localModelsList: document.getElementById('local-models-list'),
      closeLocalModels: document.getElementById('close-local-models'),
      scanStatus: document.getElementById('scan-status'),
      rescanBtn: document.getElementById('rescan-btn'),
      typingIndicator: document.getElementById('typing-indicator'),
      tokenCount: document.getElementById('token-count'),
      exportBtn: document.getElementById('export-btn'),
      importBtn: document.getElementById('import-btn'),
      importInput: document.getElementById('import-input'),
      searchInput: document.getElementById('search-input'),
      editToolbar: document.getElementById('edit-toolbar'),
      editCancelBtn: document.getElementById('edit-cancel-btn'),
      mcpDashboardBtn: document.getElementById('mcp-dashboard-btn'),
      mcpDashboardModal: document.getElementById('mcp-dashboard-modal'),
      mcpDashboardPanel: document.getElementById('mcp-dashboard-panel'),
      mcpDashboardClose: document.getElementById('close-mcp-dashboard'),
      mcpPluginList: document.getElementById('mcp-plugin-list'),
      mcpRequestLog: document.getElementById('mcp-request-log'),
      mcpLastResult: document.getElementById('mcp-last-result'),
      serversBtn: document.getElementById('servers-btn'),
      serversModal: document.getElementById('servers-modal'),
      serversPanel: document.getElementById('servers-panel'),
      serversClose: document.getElementById('close-servers'),
      serversList: document.getElementById('servers-list'),
      serverToolList: document.getElementById('server-tool-list'),
      serverToolResult: document.getElementById('server-tool-result'),

      // right sidebar elements
      rightSidebar: document.getElementById('right-sidebar'),
      aiThinking: document.getElementById('ai-thinking-val'),
      aiProcessList: document.getElementById('ai-process-list'),
      cpuBar: document.getElementById('cpu-bar'),
      cpuValue: document.getElementById('cpu-value'),
      memoryBar: document.getElementById('memory-bar'),
      memoryValue: document.getElementById('memory-value'),
      networkBar: document.getElementById('network-bar'),
      networkValue: document.getElementById('network-value'),
      gpuBar: document.getElementById('gpu-bar'),
      gpuValue: document.getElementById('gpu-value'),
      threadsValue: document.getElementById('threads-value'),
      diskBar: document.getElementById('disk-bar'),
      diskValue: document.getElementById('disk-value'),
      uptimeValue: document.getElementById('uptime-value'),
      reqRateValue: document.getElementById('reqrate-value'),
      queueValue: document.getElementById('queue-value'),
      latencyBar: document.getElementById('latency-bar'),
      latencyValue: document.getElementById('latency-value'),
      // charts/canvases
      cpuSpark: document.getElementById('cpu-spark'),
      memSpark: document.getElementById('mem-spark'),
      reqChart: document.getElementById('req-chart'),
      // cards
      cardThroughput: document.getElementById('card-throughput'),
      cardLatency: document.getElementById('card-latency'),
      cardErrors: document.getElementById('card-errors'),
    };
  }

  bindEvents() {
    this.elements.providerSelect?.addEventListener('change', () => this.onProviderChange());
    this.elements.modelSelect?.addEventListener('change', () => this.onModelChange());
    if (this.elements.modelFavBtn) {
      this.elements.modelFavBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentModel) this.toggleFavoriteModel(this.currentModel);
      });
    }
    if (this.elements.modelInfo) {
      this.elements.modelInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.elements.modelDetailsPopup) {
          this.elements.modelDetailsPopup.classList.toggle('visible');
        }
      });
    }
    document.addEventListener('click', () => {
      if (this.elements.modelDetailsPopup) this.elements.modelDetailsPopup.classList.remove('visible');
    });
    this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());
    this.elements.stopBtn.addEventListener('click', () => this.stopGeneration());
    this.elements.chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });
    this.elements.chatInput.addEventListener('input', () => this.updateSendButton());
    this.elements.themeSelect.addEventListener('change', e => this.themeManager.setTheme(e.target.value));
    this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
    this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
    this.elements.saveKeysBtn.addEventListener('click', () => this.saveApiKeys());
    this.elements.newChatBtn.addEventListener('click', () => this.newConversation());
    this.elements.localModelsBtn.addEventListener('click', () => this.showLocalModels());
    this.elements.closeLocalModels.addEventListener('click', () => this.hideLocalModels());
    this.elements.rescanBtn.addEventListener('click', () => this.scanLocalModels());
    this.elements.exportBtn.addEventListener('click', () => this.exportConversations());
    this.elements.importBtn.addEventListener('click', () => this.elements.importInput.click());
    this.elements.importInput.addEventListener('change', e => this.importConversations(e));
    this.elements.searchInput.addEventListener('input', e => this.filterConversations(e.target.value));
    this.elements.editCancelBtn.addEventListener('click', () => this.cancelEdit());
    this.elements.mcpDashboardBtn.addEventListener('click', () => this.showMCPDashboard());
    this.elements.mcpDashboardClose.addEventListener('click', () => this.hideMCPDashboard());
    this.elements.serversBtn.addEventListener('click', () => this.showServers());
    this.elements.serversClose.addEventListener('click', () => this.hideServers());

    this.elements.serversList.addEventListener('click', e => {
      const startBtn = e.target.closest('.server-start-btn');
      if (startBtn) { this.startServer(startBtn.dataset.server); return; }
      const stopBtn = e.target.closest('.server-stop-btn');
      if (stopBtn) { this.stopServer(stopBtn.dataset.server); return; }
      const toolBtn = e.target.closest('.server-tool-btn');
      if (toolBtn) {
        this.callTool(toolBtn.dataset.server, toolBtn.dataset.tool);
      }
    });

    this.elements.serverToolList.addEventListener('click', e => {
      const toolBtn = e.target.closest('.tool-call-btn');
      if (toolBtn) {
        this.callTool(toolBtn.dataset.server, toolBtn.dataset.tool);
      }
    });

    document.addEventListener('keydown', e => this.handleKeyboardShortcuts(e));

    document.addEventListener('click', e => {
      if (e.target === this.elements.settingsModal) this.hideSettings();
      if (e.target === this.elements.localModelsPanel) this.hideLocalModels();
      if (e.target === this.elements.mcpDashboardModal) this.hideMCPDashboard();
      if (e.target === this.elements.serversModal) this.hideServers();
    });

    this.elements.chatMessages.addEventListener('click', e => {
      const messageEl = e.target.closest('.message.editable');
      if (messageEl) this.startEditMessage(messageEl);
    });

    this.elements.mcpPluginList.addEventListener('click', e => {
      const toggle = e.target.closest('.mcp-plugin-toggle');
      if (toggle) {
        const name = toggle.dataset.plugin;
        const enabled = toggle.classList.contains('active');
        this.mcpPipeline.setPluginEnabled(name, !enabled);
        toggle.classList.toggle('active');
        this.renderMCPDashboard();
      }
    });

    this.elements.mcpDashboardPanel.addEventListener('click', e => {
      const tab = e.target.closest('.dashboard-tab');
      if (tab) this.switchMCPTab(tab.dataset.tab);
    });
  }

  syncThemeSelector() {
    this.elements.themeSelect.value = this.themeManager.getCurrentTheme();
    this.themeManager.onChange(theme => { this.elements.themeSelect.value = theme; });
  }

  registerMCPListener() {
    this.mcpPipeline.onChange(event => {
      switch (event.type) {
        case 'block':
          this.updateMCPStatus('blocked', event.plugin);
          break;
        case 'allowed':
          const allPassed = Object.values(event.results || {}).every(
            r => r.passed !== false || r.action === 'redact'
          );
          this.updateMCPStatus(allPassed ? 'active' : 'warning');
          break;
        case 'output':
          break;
        case 'pluginRegistered':
          if (!this.elements.mcpDashboardModal.classList.contains('hidden')) {
            this.renderMCPDashboard();
          }
          break;
        case 'pluginToggled':
          break;
        case 'autoConfigured':
          break;
        case 'health':
          if (!this.elements.mcpDashboardModal.classList.contains('hidden')) {
            this.renderMCPDashboard();
          }
          break;
      }
    });
  }

  updateMCPStatus(state, detail) {
    const el = this.elements.mcpStatus;
    el.className = 'mcp-indicator';
    if (state === 'blocked') {
      el.classList.add('blocked');
      el.textContent = `BLOCKED: ${detail || 'MCP'}`;
      el.title = `Blocked by ${detail}`;
    } else if (state === 'warning') {
      el.classList.add('warning');
      el.textContent = 'MCP: Flagged';
      el.title = 'Some MCP checks flagged content';
    } else {
      el.classList.add('active');
      el.textContent = `MCP (${this.mcpPipeline.getRegistry().getEnabled().length})`;
      el.title = 'All MCP security checks passed';
    }
  }

  // System metrics polling and right-sidebar UI
  startSystemMetrics() {
    if (this._systemInterval) return;
    this.fetchSystemMetrics();
    this._systemInterval = setInterval(() => this.fetchSystemMetrics(), 2000);
  }

  async fetchSystemMetrics() {
    try {
      let data = null;
      // Try backend endpoint first
      const res = await fetch('/api/system');
      if (res.ok) data = await res.json();
      if (!data) data = this.getBrowserMetrics();
      this.updateSystemUI(data);
    } catch (err) {
      const data = this.getBrowserMetrics();
      this.updateSystemUI(data);
    }
  }

  updateSystemUI(data) {
    try {
      if (!this.elements) return;
      if (this.elements.typingIndicator) this.elements.typingIndicator.classList.toggle('hidden', !this.isGenerating);
      if (this.elements.aiThinking) this.elements.aiThinking.textContent = this.isGenerating ? 'active' : (data.aiThinking || 'idle');

      if (this.elements.aiProcessList && Array.isArray(data.processes)) {
        this.elements.aiProcessList.innerHTML = data.processes.map(p => `<li>${p.name} (${p.pid}) - CPU:${p.cpu}% MEM:${p.mem ?? '-'}%</li>`).join('');
      }

      // CPU
      const cpu = Math.round(data.cpu?.usage || 0);
      if (this.elements.cpuValue) this.elements.cpuValue.textContent = cpu + '%';
      if (this.elements.cpuBar) this.elements.cpuBar.style.width = Math.min(100, Math.max(0, cpu)) + '%';

      // Memory
      const memUsed = data.memory?.used || 0;
      const memTotal = data.memory?.total || (navigator.deviceMemory ? navigator.deviceMemory * 1024 : 0);
      const memPct = memTotal ? Math.round((memUsed / memTotal) * 100) : 0;
      if (this.elements.memoryValue) this.elements.memoryValue.textContent = memUsed && memTotal ? `${Math.round(memUsed/1024)}MB / ${Math.round(memTotal/1024)}MB` : '-';
      if (this.elements.memoryBar) this.elements.memoryBar.style.width = Math.min(100, Math.max(0, memPct)) + '%';

      // Network
      const net = data.network?.rx ? `${data.network.rx} / ${data.network.tx}` : (data.network?.speed || '-');
      if (this.elements.networkValue) this.elements.networkValue.textContent = net;
      if (this.elements.networkBar) this.elements.networkBar.style.width = Math.min(100, Math.max(0, data.network?.usage || 0)) + '%';

      // GPU
      if (this.elements.gpuValue) this.elements.gpuValue.textContent = data.gpu?.usage ? `${data.gpu.usage}%` : (data.gpu?.name || '-');
      if (this.elements.gpuBar) this.elements.gpuBar.style.width = Math.min(100, Math.max(0, data.gpu?.usage || 0)) + '%';

      // Threads / Concurrency
      if (this.elements.threadsValue) this.elements.threadsValue.textContent = data.threads || navigator.hardwareConcurrency || '-';

      // Disk
      if (this.elements.diskValue) this.elements.diskValue.textContent = data.disk?.used && data.disk?.total ? `${Math.round(data.disk.used/1024)}MB / ${Math.round(data.disk.total/1024)}MB` : '-';
      if (this.elements.diskBar) this.elements.diskBar.style.width = Math.min(100, Math.max(0, data.disk?.usage || 0)) + '%';

      // Uptime
      const uptimeSecs = data.uptime || Math.floor(performance.now() / 1000);
      if (this.elements.uptimeValue) {
        let s = uptimeSecs; const h = Math.floor(s/3600); s%=3600; const m = Math.floor(s/60); const sec = s%60;
        this.elements.uptimeValue.textContent = `${h}h ${m}m ${sec}s`;
      }

      // Request rate & queue (treat 0 as valid)
      const reqRateVal = (data.requestRate ?? data.reqRate ?? null);
      if (this.elements.reqRateValue) this.elements.reqRateValue.textContent = reqRateVal != null ? `${reqRateVal} req/s` : '-';
      if (this.elements.queueValue) this.elements.queueValue.textContent = (data.queueLength != null ? String(data.queueLength) : '-');

      // Cards: throughput, latency, errors
      if (this.elements.cardThroughput) this.elements.cardThroughput.textContent = reqRateVal != null ? `${reqRateVal} req/s` : '-';
      const lat = (data.latency ?? null);
      if (this.elements.cardLatency) this.elements.cardLatency.textContent = lat != null ? `${lat} ms` : '-';
      const errRate = data.errorRate ?? data.error_rate ?? null;
      if (this.elements.cardErrors) this.elements.cardErrors.textContent = errRate != null ? `${errRate}%` : '-';

      // Latency (bar)
      if (this.elements.latencyValue) this.elements.latencyValue.textContent = lat != null ? `${lat}ms` : '-';
      const numericLat = Number(lat) || 0;
      if (this.elements.latencyBar) this.elements.latencyBar.style.width = Math.min(100, Math.max(0, (numericLat / 1000) * 100)) + '%';

      // update charts history and redraw
      try {
        const reqRate = Number(data.requestRate || data.reqRate || 0);
        // maintain rolling windows
        if (!Array.isArray(this.cpuHistory)) this.cpuHistory = Array(30).fill(0);
        if (!Array.isArray(this.memHistory)) this.memHistory = Array(30).fill(0);
        if (!Array.isArray(this.reqHistory)) this.reqHistory = Array(60).fill(0);

        this.cpuHistory.shift(); this.cpuHistory.push(cpu);
        this.memHistory.shift(); this.memHistory.push(memPct);
        this.reqHistory.shift(); this.reqHistory.push(reqRate);

        if (this.charts?.cpu) { this.charts.cpu.data.datasets[0].data = this.cpuHistory; this.charts.cpu.update('none'); }
        if (this.charts?.mem) { this.charts.mem.data.datasets[0].data = this.memHistory; this.charts.mem.update('none'); }
        if (this.charts?.req) { this.charts.req.data.datasets[0].data = this.reqHistory; this.charts.req.update('none'); }
      } catch (e) { /* non-fatal */ }

    } catch (err) { console.warn('updateSystemUI error', err); }
  }

  // create lightweight charts using Chart.js (if available)
  createCharts() {
    try {
      if (!window.Chart || !this.elements) return;
      const cpuCtx = this.elements.cpuSpark?.getContext && this.elements.cpuSpark.getContext('2d');
      const memCtx = this.elements.memSpark?.getContext && this.elements.memSpark.getContext('2d');
      const reqCtx = this.elements.reqChart?.getContext && this.elements.reqChart.getContext('2d');

      const cpuLabels = Array(this.cpuHistory.length).fill('');
      const memLabels = Array(this.memHistory.length).fill('');
      const reqLabels = Array(this.reqHistory.length).fill('');

      if (cpuCtx) {
        this.charts.cpu = new Chart(cpuCtx, {
          type: 'line',
          data: { labels: cpuLabels, datasets: [{ data: this.cpuHistory, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', pointRadius: 0, borderWidth: 1 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { tension: 0.3 } } }
        });
      }
      if (memCtx) {
        this.charts.mem = new Chart(memCtx, {
          type: 'line',
          data: { labels: memLabels, datasets: [{ data: this.memHistory, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.06)', pointRadius: 0, borderWidth: 1 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { tension: 0.3 } } }
        });
      }
      if (reqCtx) {
        this.charts.req = new Chart(reqCtx, {
          type: 'line',
          data: { labels: reqLabels, datasets: [{ data: this.reqHistory, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)', pointRadius: 0, borderWidth: 1 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true, display: true, ticks: { maxTicksLimit: 3 } } }, elements: { line: { tension: 0.25 } } }
        });
      }
    } catch (e) { console.warn('createCharts failed', e); }
  }

  getBrowserMetrics() {
    const cpu = 0;
    const memory = { used: 0, total: (navigator.deviceMemory? navigator.deviceMemory*1024 : 0) };
    const network = { rx: 0, tx: 0, usage: 0 };
    try {
      if (performance?.memory) {
        memory.used = Math.round(performance.memory.usedJSHeapSize/1024);
        memory.total = Math.round(performance.memory.totalJSHeapSize/1024);
      }
      if (navigator.connection) {
        network.speed = navigator.connection.downlink + 'Mb/s';
      }
    } catch(e){}
    return { cpu: { usage: cpu }, memory, network };
  }

  registerLocalScanListener() {
    this.localScanner.onModelsChange(() => {
      if (this.currentProvider === 'local') this.populateModelSelector();
    });
  }

  registerServerListener() {
    this.serverManager.onChange(event => {
      if (!this.elements.serversModal.classList.contains('hidden')) {
        this.renderServers();
      }
      if (event.type === 'serverStarted' || event.type === 'serverStopped') {
        this.addSystemMessage(`MCP Server "${event.name}" ${event.type === 'serverStarted' ? 'started' : 'stopped'}`, 'info');
      }
      if (event.type === 'toolCalled') {
        this.renderServers();
      }
    });
  }

  initServers() {
    if (CONFIG.mcpServers?.autoStart) {
      setTimeout(() => {
        this.serverManager.startAll();
        this.addSystemMessage(`MCP Servers initialized`, 'info');
      }, 1000);
    }
  }

  showServers() {
    this.elements.serversModal.classList.remove('hidden');
    this.elements.serversPanel.classList.remove('hidden');
    this.renderServers();
    this.renderServerTools();
  }

  hideServers() {
    this.elements.serversModal.classList.add('hidden');
    this.elements.serversPanel.classList.add('hidden');
  }

  renderServers() {
    const servers = this.serverManager.getAll();
    if (servers.length === 0) {
      this.elements.serversList.innerHTML = '<div class="no-models">No MCP servers available</div>';
      return;
    }
    this.elements.serversList.innerHTML = servers.map(s => `
      <div class="server-item ${s.status}">
        <div class="server-header">
          <span class="server-name">${s.name}</span>
          <span class="server-status ${s.status}">${s.status}</span>
        </div>
        <div class="server-desc">${s.description || ''}</div>
        <div class="server-meta">
          <span>${s.toolCount} tools</span>
          <span>${s.resourceCount} resources</span>
          <span>${s.promptCount} prompts</span>
          ${s.startedAt ? `<span>Started: ${new Date(s.startedAt).toLocaleTimeString()}</span>` : ''}
        </div>
        <div class="server-actions">
          ${s.status === 'running'
            ? `<button class="server-stop-btn" data-server="${s.name}">Stop</button>`
            : `<button class="server-start-btn" data-server="${s.name}">Start</button>`
          }
          <button class="server-tool-btn" data-server="${s.name}">Show Tools</button>
        </div>
      </div>
    `).join('');
  }

  renderServerTools(serverName) {
    const servers = serverName
      ? [this.serverManager.getEntry(serverName)].filter(Boolean)
      : this.serverManager.getAll().filter(s => s.status === 'running');

    if (servers.length === 0) {
      this.elements.serverToolList.innerHTML = '<div class="no-models">Start a server to see its tools</div>';
      this.elements.serverToolResult.innerHTML = '';
      return;
    }

    this.elements.serverToolList.innerHTML = servers.map(s => {
      const tools = this.serverManager.getTools(s.name);
      if (tools.length === 0) return '';
      return `
        <div class="server-tool-group">
          <div class="mcp-category-header">${s.name}</div>
          ${tools.map(t => `
            <div class="tool-item">
              <div class="tool-header">
                <span class="tool-name">${t.name}</span>
                <button class="tool-call-btn" data-server="${s.name}" data-tool="${t.name}">Run</button>
              </div>
              <div class="tool-desc">${t.description || ''}</div>
              ${t.inputSchema?.properties ? `
                <div class="tool-params">
                  ${Object.entries(t.inputSchema.properties).map(([k, v]) =>
                    `<span class="tool-param">${k}: ${v.type}${t.inputSchema.required?.includes(k) ? ' *' : ''}</span>`
                  ).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }).join('') || '<div class="no-models">No tools available</div>';
  }

  async startServer(name) {
    try {
      this.addSystemMessage(`Starting MCP Server "${name}"...`, 'info');
      await this.serverManager.start(name);
      this.renderServers();
      this.renderServerTools();
    } catch (err) {
      this.addSystemMessage(`Failed to start "${name}": ${err.message}`, 'error');
    }
  }

  stopServer(name) {
    this.serverManager.stop(name);
    this.renderServers();
    this.renderServerTools();
    this.addSystemMessage(`MCP Server "${name}" stopped`, 'info');
  }

  async callTool(serverName, toolName) {
    try {
      const entry = this.serverManager.getEntry(serverName);
      if (!entry || entry.status !== 'running') {
        this.addSystemMessage(`Server "${serverName}" is not running. Start it first.`, 'warning');
        return;
      }

      this.addSystemMessage(`Calling ${serverName}.${toolName}...`, 'info');
      const toolbox = document.querySelector('.server-tool-panel');
      const inputArea = toolbox?.querySelector('.tool-input-area');

      let args = {};
      if (inputArea) {
        const jsonInput = inputArea.querySelector('.tool-json-input');
        if (jsonInput?.value) {
          try { args = JSON.parse(jsonInput.value); }
          catch { args = { input: jsonInput.value }; }
        }
      }

      const result = await this.serverManager.callToolFromChat(serverName, toolName, args);

      this.elements.serverToolResult.innerHTML = `
        <div class="mcp-result-header">${serverName}.${toolName} Result</div>
        <pre class="tool-result-content">${this.escapeHtml(result)}</pre>
      `;

      this.addSystemMessage(`Tool result: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`, 'info');
    } catch (err) {
      this.addSystemMessage(`Tool call failed: ${err.message}`, 'error');
      this.elements.serverToolResult.innerHTML = `
        <div class="mcp-result-header" style="color:var(--accent-danger)">Error</div>
        <pre class="tool-result-content" style="color:var(--accent-danger)">${this.escapeHtml(err.message)}</pre>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  autoConfigureMCP() {
    this.mcpPipeline.autoConfigure({
      provider: this.currentProvider,
      model: this.currentModel,
      sessionId: this.mcpPipeline.auditLog.sessionId,
    });
  }

  populateProviderSelector() {
    this.elements.providerSelect.innerHTML = Object.entries(CONFIG.providers)
      .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
      .join('');
    this.elements.providerSelect.value = this.currentProvider;
  }

  getModelCapabilities(modelId) {
    const caps = [];
    const id = modelId.toLowerCase();
    if (id.includes('gpt-4o') || id.includes('gemini-2.0') || id.includes('gemini-1.5') || id.includes('claude-3') || id.includes('claude-sonnet-4')) caps.push('vision');
    if (id.includes('o1') || id.includes('o3') || id.includes('deepseek-r1') || id.includes('reasoning')) caps.push('reasoning');
    if (id.includes('flash') || id.includes('mini') || id.includes('haiku') || id.includes('8b') || id.includes('3b')) caps.push('fast');
    if (id.includes('code') || id.includes('coder') || id.includes('codellama')) caps.push('code');
    return caps;
  }

  getModelContextWindow(modelId) {
    const id = modelId.toLowerCase();
    if (id.includes('gemini')) return '1M';
    if (id.includes('claude')) return '200K';
    if (id.includes('gpt-4o') || id.includes('o1') || id.includes('o3')) return '128K';
    if (id.includes('gpt-4')) return '128K';
    if (id.includes('gpt-3.5')) return '16K';
    if (id.includes('llama3.2') || id.includes('llama3.1')) return '128K';
    if (id.includes('llama3')) return '8K';
    if (id.includes('mistral') || id.includes('mixtral')) return '32K';
    if (id.includes('deepseek') || id.includes('qwen')) return '32K';
    if (id.includes('codellama')) return '16K';
    return '—';
  }

  loadFavoriteModels() {
    try {
      return JSON.parse(localStorage.getItem('favorite_models') || '[]');
    } catch { return []; }
  }

  saveFavoriteModels(favs) {
    localStorage.setItem('favorite_models', JSON.stringify(favs));
  }

  isFavoriteModel(modelId) {
    return this.loadFavoriteModels().includes(modelId);
  }

  toggleFavoriteModel(modelId) {
    let favs = this.loadFavoriteModels();
    if (favs.includes(modelId)) {
      favs = favs.filter(f => f !== modelId);
    } else {
      favs.push(modelId);
    }
    this.saveFavoriteModels(favs);
    this.updateFavButton(modelId);
    this.populateModelSelector();
  }

  updateFavButton(modelId) {
    const btn = this.elements.modelFavBtn;
    if (!btn) return;
    const isFav = this.isFavoriteModel(modelId);
    btn.textContent = isFav ? '★' : '☆';
    btn.classList.toggle('favorited', isFav);
    btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
  }

  populateModelSelector() {
    const provider = this.currentProvider;
    const config = CONFIG.providers[provider];
    const isLocal = provider === 'local';
    let models = [...config.models];

    if (isLocal) {
      const localModels = this.localScanner.getModels();
      for (const lm of localModels) {
        if (!models.includes(lm.id)) models.push(lm.id);
      }
    }

    const favorites = this.loadFavoriteModels();
    const sorted = [...models].sort((a, b) => {
      const aFav = favorites.includes(a) ? 0 : 1;
      const bFav = favorites.includes(b) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.localeCompare(b);
    });

    const seen = new Set();
    const options = [];
    let favHeaderAdded = false;
    for (const id of sorted) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!favHeaderAdded && favorites.includes(id) && id === sorted[0]) {
        options.push('<option disabled style="font-size:11px;color:var(--text-muted)">★ Favorites</option>');
        favHeaderAdded = true;
        seen.add('__fav_header__');
      }
      options.push(
        `<option value="${id}" ${id === this.currentModel || (!this.currentModel && id === config.defaultModel) ? 'selected' : ''}>
          ${id}${isLocal && this.localScanner.getModels().find(m => m.id === id) ? '  (local)' : ''}
        </option>`
      );
    }

    this.elements.modelSelect.innerHTML = options.join('');

    if (!this.currentModel) {
      this.currentModel = this.elements.modelSelect.value;
    }
    this.updateFavButton(this.currentModel);
    this.updateModelInfo();
  }

  onProviderChange() {
    this.currentProvider = this.elements.providerSelect.value;
    this.currentModel = null;
    if (this.currentProvider === 'local') {
      this.providers.local.setEndpoint('ollama');
    }
    this.populateModelSelector();
    this.checkApiKey();
    this.autoConfigureMCP();
    this.addSystemMessage(`Switched to ${CONFIG.providers[this.currentProvider].name}`);
  }

  onModelChange() {
    this.currentModel = this.elements.modelSelect.value;
    this.updateFavButton(this.currentModel);
    this.updateModelInfo();
    this.autoConfigureMCP();
  }

  async sendMessage(textOverride, editIndex) {
    const isEditMode = this.editingMessageIndex >= 0;
    const targetEditIndex = editIndex !== undefined ? editIndex : (isEditMode ? this.editingMessageIndex : -1);
    const text = textOverride !== undefined ? textOverride : this.elements.chatInput.value.trim();
    if (!text || this.isGenerating) return;

    if (textOverride === undefined) {
      this.elements.chatInput.value = '';
    }
    this.updateSendButton();

    if (targetEditIndex >= 0) {
      this.messageHistory[targetEditIndex].content = text;
      this.messageHistory.length = targetEditIndex + 1;
      this.elements.chatMessages.innerHTML = '';
      for (const msg of this.messageHistory) {
        this.addMessage(msg);
      }
      this.editingMessageIndex = -1;
      this.hideEditToolbar();
    } else {
      const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
      this.addMessage(userMessage);
      this.messageHistory.push(userMessage);
    }

    this.showTyping();
    this.elements.stopBtn.classList.remove('hidden');

    const mcpInputResult = await this.mcpPipeline.processInput(text, {
      provider: this.currentProvider,
      model: this.currentModel,
      conversationId: this.activeConversationId,
      requestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    if (!mcpInputResult.passed) {
      this.hideTyping();
      this.elements.stopBtn.classList.add('hidden');
      this.addSystemMessage(`Blocked by ${mcpInputResult.blockedBy}: ${mcpInputResult.message}`, 'error');
      return;
    }

    if (mcpInputResult.cached && mcpInputResult.response) {
      this.hideTyping();
      this.elements.stopBtn.classList.add('hidden');
      const cachedMsg = {
        role: 'assistant',
        content: mcpInputResult.response,
        model: this.currentModel,
        provider: this.currentProvider,
        cached: true,
        timestamp: new Date().toISOString(),
      };
      this.addMessage(cachedMsg);
      this.messageHistory.push(cachedMsg);
      this.addSystemMessage('Response served from cache', 'info');
      this.saveCurrentConversation();
      this.lastMCPResults = mcpInputResult.results;
      return;
    }

    const processedText = mcpInputResult.message || text;
    this.currentModel = this.elements.modelSelect.value || this.currentModel;
    this.isGenerating = true;

    try {
      const provider = this.providers[this.currentProvider];
      if (!provider) throw new Error(`Unknown provider: ${this.currentProvider}`);

      const apiKey = provider.getApiKey();
      if (!apiKey && this.currentProvider !== 'local') {
        this.hideTyping();
        this.elements.stopBtn.classList.add('hidden');
        this.isGenerating = false;
        this.addSystemMessage(`Please set your API key for ${CONFIG.providers[this.currentProvider].name} in settings.`, 'error');
        this.showSettings();
        return;
      }

      this.abortController = new AbortController();
      let conversationMessages = this.messageHistory.map(m => ({ role: m.role, content: m.content }));
      const startTime = performance.now();

      await this._runChatWithTools(conversationMessages, processedText, mcpInputResult);
      this.saveCurrentConversation();

    } catch (err) {
      this.isGenerating = false;
      this.elements.stopBtn.classList.add('hidden');
      this.abortController = null;
      this.hideTyping();
      this.addSystemMessage(`Error: ${err.message}`, 'error');
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isGenerating = false;
    this.elements.stopBtn.classList.add('hidden');
  }

  _getToolContext() {
    const servers = this.serverManager.getAll().filter(s => s.status === 'running');
    if (servers.length === 0) return '';
    const lines = ['\n\nAvailable MCP Tools (respond with a tool call using: TOOL_CALL: serverName.toolName({"arg":"value"}) ):'];
    for (const s of servers) {
      const tools = this.serverManager.getTools(s.name);
      if (tools.length === 0) continue;
      lines.push(`\n## ${s.name} (${s.description || ''})`);
      for (const t of tools) {
        const params = t.inputSchema?.properties
          ? Object.entries(t.inputSchema.properties).map(([k, v]) => `${k} (${v.type})`).join(', ')
          : '';
        lines.push(`  - ${t.name}: ${t.description || ''}${params ? ' [' + params + ']' : ''}`);
        lines.push(`    Usage: TOOL_CALL: ${s.name}.${t.name}({...})`);
      }
    }
    return lines.join('\n');
  }

  async _runToolCall(serverName, toolName, args) {
    const servers = this.serverManager.getAll().filter(s => s.status === 'running');
    if (!servers.find(s => s.name === serverName)) {
      return `Error: Server "${serverName}" is not running`;
    }
    try {
      let parsedArgs = args;
      if (typeof args === 'string') {
        try { parsedArgs = JSON.parse(args); }
        catch { parsedArgs = { input: args }; }
      }
      const result = await this.serverManager.callToolFromChat(serverName, toolName, parsedArgs);
      return result;
    } catch (err) {
      return `Error calling ${serverName}.${toolName}: ${err.message}`;
    }
  }

  _parseToolCalls(content) {
    const calls = [];
    const regex = /TOOL_CALL:\s*(\w+)\.(\w+)\(({.*?})\)/gs;
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        calls.push({
          server: match[1],
          tool: match[2],
          args: JSON.parse(match[3]),
          full: match[0],
        });
      } catch {
        calls.push({
          server: match[1],
          tool: match[2],
          args: match[3],
          full: match[0],
        });
      }
    }
    return calls;
  }

  async _runChatWithTools(conversationMessages, userText, mcpInputResult) {
    const maxToolRounds = CONFIG.mcpAutomation?.maxToolRounds || 5;
    let toolRound = 0;
    const provider = this.providers[this.currentProvider];
    const toolContext = this._getToolContext();

    let messages = [
      ...conversationMessages.slice(0, -1),
      { role: 'user', content: userText + toolContext },
    ];
    let fullContent = '';
    let streamedMessage = null;
    let startTime = performance.now();

    while (toolRound <= maxToolRounds) {
      fullContent = '';
      streamedMessage = null;

      const stream = await provider.stream(this.currentModel, messages, {
        signal: this.abortController?.signal,
      });

      this.hideTyping();

      try {
        for await (const chunk of stream) {
          if (this.abortController?.signal.aborted) break;
          fullContent += chunk;

          if (!streamedMessage) {
            streamedMessage = {
              role: 'assistant', content: '',
              model: this.currentModel, provider: this.currentProvider,
              timestamp: new Date().toISOString(),
            };
            this.addStreamingMessage(streamedMessage);
          }

          this.updateStreamingContent(fullContent);
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.message?.includes('abort') || this.abortController?.signal.aborted) {
          this.addSystemMessage('Generation stopped', 'warning');
          break;
        }
        throw err;
      }

      if (this.abortController?.signal.aborted && !fullContent) break;

      const latency = performance.now() - startTime;

      if (streamedMessage) {
        streamedMessage.content = fullContent;
        streamedMessage.latency = latency;
      }

      const mcpOutputResult = await this.mcpPipeline.processOutput(fullContent, {
        provider: this.currentProvider,
        model: this.currentModel,
        latency,
        messages,
        finishReason: 'stop',
      });

      if (streamedMessage) {
        streamedMessage.content = mcpOutputResult.response || fullContent;
        this.finalizeStreamingMessage(streamedMessage);
      }

      const toolCalls = this._parseToolCalls(fullContent);
      if (toolCalls.length === 0 || toolRound >= maxToolRounds) {
        if (streamedMessage) {
          this.messageHistory.push(streamedMessage);
          const resultBadge = this.elements.chatMessages.lastElementChild?.querySelector('.message-mcp-badge');
          if (resultBadge) {
            this.renderMCPResultBadge(resultBadge, mcpInputResult.results);
          }
        }
        this.lastMCPResults = mcpInputResult.results;
        this.isGenerating = false;
        this.elements.stopBtn.classList.add('hidden');
        this.abortController = null;
        if (toolCalls.length > 0 && toolRound >= maxToolRounds) {
          this.addSystemMessage(`Reached maximum tool call rounds (${maxToolRounds})`, 'warning');
        }
        return;
      }

      toolRound++;
      this.addSystemMessage(`Tool call round ${toolRound}: executing ${toolCalls.length} tool(s)...`, 'info');

      for (const tc of toolCalls) {
        const toolResult = await this._runToolCall(tc.server, tc.tool, tc.args);
        const cleanContent = fullContent.replace(tc.full, '').trim();

        if (streamedMessage) {
          streamedMessage.content = cleanContent;
          this.messageHistory.push(streamedMessage);
        }

        this.messageHistory.push({
          role: 'assistant',
          content: `[Tool Call: ${tc.server}.${tc.tool}]`,
          toolCall: { server: tc.server, tool: tc.tool, args: tc.args },
          timestamp: new Date().toISOString(),
        });

        this.messageHistory.push({
          role: 'user',
          content: `[Tool Result: ${tc.server}.${tc.tool}]\n${toolResult}`,
          toolResult: true,
          timestamp: new Date().toISOString(),
        });

        this.addMessage({
          role: 'assistant',
          content: `🔧 Called ${tc.server}.${tc.tool} — result received`,
          isSystem: true,
        });

        const removeEl = document.getElementById('streaming-message');
        if (removeEl) removeEl.remove();
      }

      messages = this.messageHistory.map(m => ({ role: m.role, content: m.content }));
    }
  }

  addStreamingMessage(message) {
    const div = document.createElement('div');
    div.className = 'message assistant streaming';
    div.id = 'streaming-message';

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = `${CONFIG.providers[this.currentProvider]?.name || 'AI'} · ${this.currentModel}`;

    const content = document.createElement('div');
    content.className = 'message-content';

    const badge = document.createElement('div');
    badge.className = 'message-mcp-badge';

    div.appendChild(header);
    div.appendChild(content);
    div.appendChild(badge);

    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    cursor.textContent = '\u2588';
    content.appendChild(cursor);

    this.elements.chatMessages.appendChild(div);
    this.scrollToBottom();
  }

  updateStreamingContent(text) {
    const el = document.getElementById('streaming-message');
    if (!el) return;
    const content = el.querySelector('.message-content');
    if (!content) return;
    const cursor = content.querySelector('.streaming-cursor');
    if (cursor) { content.textContent = text; content.appendChild(cursor); }
    else { content.textContent = text + '\u2588'; }
    this.scrollToBottom();
  }

  finalizeStreamingMessage(message) {
    const el = document.getElementById('streaming-message');
    if (!el) return;
    el.classList.remove('streaming');
    el.id = '';
    const content = el.querySelector('.message-content');
    if (content) {
      const cursor = content.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      content.textContent = message.content;
    }
    if (message.latency) {
      const footer = document.createElement('div');
      footer.className = 'message-footer';
      footer.textContent = `${(message.latency / 1000).toFixed(1)}s`;
      el.appendChild(footer);
    }
  }

  renderMCPResultBadge(container, results) {
    if (!results) return;
    const plugins = Object.entries(results);
    if (plugins.length === 0) return;

    const passed = plugins.filter(([, r]) => r.passed !== false).length;
    const total = plugins.length;

    container.innerHTML = `<span class="mcp-msg-badge ${total === passed ? 'pass' : 'warn'}">MCP ${passed}/${total}</span>`;
    container.title = plugins.map(([name, r]) =>
      `${name}: ${r.passed !== false ? 'passed' : r.action === 'redact' ? 'redacted' : 'flagged'}${r.message ? ' - ' + r.message.substring(0, 60) : ''}`
    ).join('\n');
  }

  addMessage(message, type = 'message') {
    const div = document.createElement('div');
    const role = message.role || type;
    div.className = `message ${role}`;
    if (role === 'user') div.classList.add('editable');

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : (message.model ? `${CONFIG.providers[this.currentProvider]?.name || 'AI'} · ${message.model}` : 'System');

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;

    div.appendChild(header);
    div.appendChild(content);

    if (message.cached) {
      const badge = document.createElement('span');
      badge.className = 'cache-badge';
      badge.textContent = 'Cached';
      header.appendChild(badge);
    }

    if (role === 'assistant' && !message.isSystem) {
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'msg-action-btn copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(message.content).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = message.content;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
      actions.appendChild(copyBtn);
      div.appendChild(actions);
    }

    const footerParts = [];
    if (message.timestamp) {
      const t = new Date(message.timestamp);
      footerParts.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    if (message.latency) footerParts.push(`${(message.latency / 1000).toFixed(1)}s`);
    if (message.usage) {
      const input = message.usage.inputTokens || message.usage.promptTokens || '';
      const output = message.usage.outputTokens || message.usage.candidatesTokens || '';
      if (input || output) footerParts.push(`${input || '?'} in / ${output || '?'} out`);
    }
    if (footerParts.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'message-footer';
      footer.textContent = footerParts.join(' \u00b7 ');
      div.appendChild(footer);
    }

    if (role === 'assistant' && this.lastMCPResults && !message.cached) {
      const badge = document.createElement('div');
      badge.className = 'message-mcp-badge';
      this.renderMCPResultBadge(badge, this.lastMCPResults);
      div.appendChild(badge);
    }

    this.elements.chatMessages.appendChild(div);
    this.scrollToBottom();
  }

  addSystemMessage(text, type = 'info') {
    const div = document.createElement('div');
    div.className = `message system ${type}`;
    div.textContent = text;
    this.elements.chatMessages.appendChild(div);
    this.scrollToBottom();
  }

  startEditMessage(messageEl) {
    if (this.isGenerating) return;
    const userMessages = this.elements.chatMessages.querySelectorAll('.message.user');
    const index = Array.from(userMessages).indexOf(messageEl);
    if (index < 0) return;

    this.editingMessageIndex = index;
    const content = messageEl.querySelector('.message-content');
    this.elements.chatInput.value = content.textContent;
    this.elements.chatInput.focus();
    this.showEditToolbar(index);
    this.updateSendButton();
    this.elements.chatInput.setSelectionRange(
      this.elements.chatInput.value.length,
      this.elements.chatInput.value.length
    );
  }

  showEditToolbar(index) {
    this.elements.editToolbar.classList.remove('hidden');
    this.elements.editToolbar.querySelector('.edit-context').textContent = `Editing message ${index + 1}`;
  }

  hideEditToolbar() {
    this.elements.editToolbar.classList.add('hidden');
    const ctx = this.elements.editToolbar.querySelector('.edit-context');
    if (ctx) ctx.textContent = '';
  }

  cancelEdit() {
    this.editingMessageIndex = -1;
    this.elements.chatInput.value = '';
    this.hideEditToolbar();
    this.updateSendButton();
  }

  showTyping() {
    this.elements.typingIndicator.classList.remove('hidden');
    this.scrollToBottom();
  }

  hideTyping() {
    this.elements.typingIndicator.classList.add('hidden');
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    });
  }

  updateSendButton() {
    const hasText = this.elements.chatInput.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasText || this.isGenerating;
    this.elements.sendBtn.textContent = this.editingMessageIndex >= 0 ? 'Save' : 'Send';
  }

  updateModelInfo() {
    if (!this.elements.modelInfo) return;
    const model = this.currentModel || 'None';
    const providerName = CONFIG.providers[this.currentProvider]?.name || '';
    const caps = this.getModelCapabilities(model);
    const ctx = this.getModelContextWindow(model);

    if (this.elements.modelInfoText) {
      this.elements.modelInfoText.textContent = `${model} · ${providerName}`;
    }

    const capsEl = this.elements.modelCapsDisplay;
    if (capsEl) {
      capsEl.innerHTML = caps.map(c => `<span class="model-capability ${c}">${c}</span>`).join('');
    }

    const popup = this.elements.modelDetailsPopup;
    if (popup) {
      const isFav = this.isFavoriteModel(model);
      popup.innerHTML = `
        <div class="model-details-name">${model}</div>
        <div class="model-details-provider">${providerName} ${isFav ? '★ Favorite' : ''}</div>
        <div class="model-details-caps">${caps.map(c => `<span class="model-capability ${c}">${c}</span>`).join('')}</div>
        <div class="model-details-row">
          <span class="model-details-label">Context Window</span>
          <span class="model-details-value">${ctx}</span>
        </div>
        <div class="model-details-row">
          <span class="model-details-label">Provider</span>
          <span class="model-details-value">${providerName}</span>
        </div>
      `;
    }
  }

  checkApiKey() {
    if (this.currentProvider === 'local') return;
    const key = this.providers[this.currentProvider]?.getApiKey();
    if (!key) {
      this.addSystemMessage(`API key not configured for ${CONFIG.providers[this.currentProvider].name}. Open settings to add one.`, 'warning');
    }
  }

  promptForApiKeys() {
    const missing = Object.entries(CONFIG.providers)
      .filter(([key]) => key !== 'local')
      .filter(([_, p]) => !getApiKey(p.envKey?.replace('${', '').replace('}', '').toLowerCase()));

    if (missing.length > 0) {
      setTimeout(() => {
        this.addSystemMessage(`Welcome! Configure API keys in Settings for: ${missing.map(([_, p]) => p.name).join(', ')}`, 'info');
      }, 500);
    }
  }

  showSettings() {
    this.elements.settingsModal.classList.remove('hidden');
    this.elements.settingsPanel.classList.remove('hidden');
    this.renderApiKeyInputs();
  }

  hideSettings() {
    this.elements.settingsModal.classList.add('hidden');
    this.elements.settingsPanel.classList.add('hidden');
  }

  renderApiKeyInputs() {
    this.elements.apiKeyInputs.innerHTML = Object.entries(CONFIG.providers)
      .filter(([key]) => key !== 'local')
      .map(([key, p]) => `
        <div class="api-key-row">
          <label for="api-key-${key}">${p.name} API Key</label>
          <div class="api-key-input-group">
            <input type="password" id="api-key-${key}" value="${getApiKey(key) || ''}" placeholder="sk-..."/>
            <button type="button" class="toggle-visibility" data-target="api-key-${key}">Show</button>
          </div>
        </div>
      `).join('');

    this.elements.apiKeyInputs.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? 'Hide' : 'Show';
      });
    });
  }

  saveApiKeys() {
    for (const [key] of Object.entries(CONFIG.providers).filter(([k]) => k !== 'local')) {
      const input = document.getElementById(`api-key-${key}`);
      if (input?.value) setApiKey(key, input.value);
    }
    this.addSystemMessage('API keys saved');
    this.hideSettings();
  }

  showLocalModels() {
    this.elements.localModelsPanel.classList.remove('hidden');
    this.scanLocalModels();
  }

  hideLocalModels() {
    this.elements.localModelsPanel.classList.add('hidden');
  }

  async scanLocalModels() {
    this.elements.rescanBtn.disabled = true;
    this.elements.rescanBtn.textContent = 'Scanning...';
    try {
      const result = await this.localScanner.scan();
      this.renderLocalModels(result);
    } catch (err) {
      this.elements.localModelsList.innerHTML = `<div class="scan-error">Scan failed: ${err.message}</div>`;
    } finally {
      this.elements.rescanBtn.disabled = false;
      this.elements.rescanBtn.textContent = 'Rescan';
    }
  }

  renderLocalModels(result) {
    const { models, status, lastScan } = result;
    this.elements.scanStatus.textContent = `Last scan: ${lastScan?.toLocaleTimeString() || 'Never'}`;

    const connHtml = Object.entries(status)
      .map(([name, s]) =>
        `<span class="conn-status ${s.online ? 'online' : 'offline'}">${name}: ${s.online ? 'Online' : 'Offline'}</span>`
      ).join(' | ');

    if (models.length === 0) {
      this.elements.localModelsList.innerHTML = `
        <div class="conn-info">${connHtml}</div>
        <div class="no-models">No local models detected. Start Ollama or LM Studio.</div>`;
      return;
    }

    const modelsHtml = models.map(m => {
      const endpointKey = m.provider === 'ollama' ? 'ollama' : 'lmStudio';
      return `
      <div class="local-model-item" data-model-id="${m.id}">
        <div class="model-item-header">
          <strong>${m.id}</strong>
          <span class="model-source ${m.provider}">${m.source}</span>
        </div>
        <div class="model-item-details">
          ${m.size ? `<span>Size: ${m.size}</span>` : ''}
          ${m.details?.parameterSize ? `<span>Params: ${m.details.parameterSize}</span>` : ''}
          ${m.details?.quantizationLevel ? `<span>Quant: ${m.details.quantizationLevel}</span>` : ''}
        </div>
        ${m.provider === 'ollama' && m.details?.family !== 'unknown' ? `<div class="model-item-family">Family: ${m.details.family}</div>` : ''}
        <button class="use-model-btn" data-model="${m.id}" data-endpoint="${endpointKey}">Use This Model</button>
      </div>`;
    }).join('');

    this.elements.localModelsList.innerHTML = `<div class="conn-info">${connHtml}</div>${modelsHtml}`;

    this.elements.localModelsList.querySelectorAll('.use-model-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentProvider = 'local';
        this.elements.providerSelect.value = 'local';
        const endpointType = btn.dataset.endpoint || 'ollama';
        this.providers.local.setEndpoint(endpointType);
        this.currentModel = null;
        this.populateModelSelector();
        this.currentModel = btn.dataset.model;
        this.elements.modelSelect.value = btn.dataset.model;
        this.updateModelInfo();
        this.checkApiKey();
        this.autoConfigureMCP();
        this.hideLocalModels();
        this.addSystemMessage(`Using local model: ${btn.dataset.model} (${endpointType === 'ollama' ? 'Ollama' : 'LM Studio'})`);
      });
    });
  }

  showMCPDashboard() {
    this.elements.mcpDashboardModal.classList.remove('hidden');
    this.elements.mcpDashboardPanel.classList.remove('hidden');
    this.switchMCPTab('plugins');
    this.renderMCPDashboard();
    this.renderMCPRequestLog();
  }

  hideMCPDashboard() {
    this.elements.mcpDashboardModal.classList.add('hidden');
    this.elements.mcpDashboardPanel.classList.add('hidden');
  }

  switchMCPTab(tab) {
    this.elements.mcpDashboardPanel.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    const tabEl = this.elements.mcpDashboardPanel.querySelector(`.dashboard-tab[data-tab="${tab}"]`);
    if (tabEl) tabEl.classList.add('active');

    this.elements.mcpPluginList.style.display = tab === 'plugins' ? '' : 'none';
    this.elements.mcpLastResult.style.display = tab === 'results' ? '' : 'none';
    this.elements.mcpRequestLog.style.display = tab === 'audit' ? '' : 'none';

    if (tab === 'results') this.renderMCPResults();
    if (tab === 'audit') this.renderMCPAuditLog();
  }

  renderMCPDashboard() {
    const plugins = this.mcpPipeline.getAllPlugins();
    const registry = this.mcpPipeline.getRegistry();
    const categories = registry.getCategories();

    if (plugins.length === 0) {
      this.elements.mcpPluginList.innerHTML = '<div class="no-models">No MCP plugins registered</div>';
      return;
    }

    const html = categories.map(cat => {
      const catPlugins = plugins.filter(p => p.category === cat);
      if (catPlugins.length === 0) return '';

      return `
        <div class="mcp-category-section">
          <div class="mcp-category-header">${cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
          ${catPlugins.map(entry => {
            const meta = entry.metadata || {};
            const health = entry.health || { ok: true };
            return `
              <div class="mcp-plugin-item ${!entry.enabled ? 'disabled' : ''}">
                <div class="mcp-plugin-header">
                  <span class="mcp-plugin-name">${entry.name}</span>
                  <label class="mcp-toggle-label">
                    <input type="checkbox" class="mcp-plugin-toggle" data-plugin="${entry.name}" ${entry.enabled ? 'checked' : ''} />
                    <span class="mcp-toggle-slider"></span>
                  </label>
                </div>
                <div class="mcp-plugin-meta">
                  <span class="mcp-health ${health.ok ? 'ok' : 'error'}">${health.ok ? 'Healthy' : 'Unhealthy'}</span>
                  <span>Priority: ${entry.priority}</span>
                  ${meta.patternCount ? `<span>${meta.patternCount} patterns</span>` : ''}
                  ${meta.activeClients !== undefined ? `<span>${meta.activeClients} clients</span>` : ''}
                  ${meta.activeSessions !== undefined ? `<span>${meta.activeSessions} sessions</span>` : ''}
                  ${meta.hitRate !== undefined ? `<span>Hit rate: ${meta.hitRate}%</span>` : ''}
                  ${meta.size !== undefined ? `<span>${meta.size} entries</span>` : ''}
                </div>
                ${meta.activeConversations !== undefined ? `<div class="mcp-plugin-detail">Active conversations: ${meta.activeConversations}</div>` : ''}
                ${meta.totalUsage !== undefined ? `<div class="mcp-plugin-detail">Total tokens: ${meta.totalUsage}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');

    this.elements.mcpPluginList.innerHTML = html;

    this.elements.mcpPluginList.querySelectorAll('.mcp-plugin-toggle').forEach(cb => {
      cb.addEventListener('change', e => {
        const name = e.target.dataset.plugin;
        this.mcpPipeline.setPluginEnabled(name, e.target.checked);
        const item = e.target.closest('.mcp-plugin-item');
        if (item) item.classList.toggle('disabled', !e.target.checked);
        this.updateMCPStatus('active');
      });
    });
  }

  renderMCPRequestLog() {
    this.renderMCPResults();
    this.renderMCPAuditLog();
  }

  renderMCPResults() {
    const lastResult = this.lastMCPResults;
    if (!lastResult) {
      this.elements.mcpLastResult.innerHTML = '<div class="mcp-result-header">No request results yet. Send a message to see MCP results.</div>';
      return;
    }
    const entries = Object.entries(lastResult);
    this.elements.mcpLastResult.innerHTML = `
      <div class="mcp-result-header">Last Request Results</div>
      <div class="mcp-result-grid">
        ${entries.map(([name, r]) => `
          <div class="mcp-result-item ${r.passed !== false ? 'pass' : 'fail'}">
            <span class="mcp-result-name">${name}</span>
            <span class="mcp-result-status">${r.passed !== false ? 'passed' : r.action === 'redact' ? 'redacted' : 'blocked'}</span>
            ${r.message ? `<span class="mcp-result-msg">${r.message.substring(0, 100)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderMCPAuditLog() {
    const logs = this.mcpPipeline.getAuditLogs({ limit: 40 });
    if (logs.length === 0) {
      this.elements.mcpRequestLog.innerHTML = '<div class="no-models">No audit log entries yet</div>';
      return;
    }
    this.elements.mcpRequestLog.innerHTML = `<div class="mcp-request-log">${
      logs.slice(-40).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const icon = entry.type === 'input' ? '\u2192' : '\u2190';
        return `<div class="audit-entry">
          <span class="audit-time">${time}</span>
          <span class="audit-icon">${icon}</span>
          <span class="audit-action">${entry.action || entry.type}</span>
          <span class="audit-provider">${entry.provider || ''}</span>
        </div>`;
      }).join('')
    }</div>`;
  }

  showWelcome() {
    this.activeConversationId = null;
    this.messageHistory = [];
    if (this.elements && this.elements.chatMessages) {
      this.elements.chatMessages.innerHTML = `
        <div class="message system welcome">
          <div class="welcome-title">AI Platform</div>
          <div class="welcome-subtitle">Select a provider and model, then start chatting.</div>
        </div>
      `;
    }
    // ensure input visible and enabled
    if (this.elements && this.elements.chatInput) {
      this.elements.chatInput.value = '';
      this.updateSendButton();
      this.elements.chatInput.removeAttribute('disabled');
    }
    this.loadConversationList();
    this.updateModelInfo();
  }

  newConversation() {
    // prepare a fresh conversation, clear state
    if (this.activeConversationId && this.messageHistory.length > 0) {
      this.saveCurrentConversation();
    }
    this.stopGeneration();
    this.cancelEdit();
    this.lastMCPResults = null;
    this.activeConversationId = null;
    this.messageHistory = [];
    // clear UI
    if (this.elements && this.elements.chatMessages) this.elements.chatMessages.innerHTML = '';
    if (this.elements && this.elements.chatInput) {
      this.elements.chatInput.value = '';
      this.elements.chatInput.focus();
    }
    this.updateSendButton();
    this.loadConversationList();
  }

  saveCurrentConversation() {
    if (!this.activeConversationId) {
      this.activeConversationId = `conv_${Date.now()}`;
    }
    const conversations = this.loadConversations();
    const userMsg = this.messageHistory.find(m => m.role === 'user');
    const title = userMsg?.content?.substring(0, 60) || 'New conversation';

    conversations[this.activeConversationId] = {
      id: this.activeConversationId,
      title: title.length < 60 ? title : title + '...',
      messages: this.messageHistory,
      provider: this.currentProvider,
      model: this.currentModel,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('conversations', JSON.stringify(conversations));
    this.loadConversationList();
  }

  loadConversations() {
    try { return JSON.parse(localStorage.getItem('conversations') || '{}'); }
    catch { return {}; }
  }

  loadConversation(id) {
    if (!id) { this.showWelcome(); return; }
    const conversations = this.loadConversations();
    const conv = conversations[id];
    if (!conv) { this.showWelcome(); return; }

    this.activeConversationId = id;
    this.messageHistory = conv.messages || [];
    this.currentProvider = conv.provider || 'openai';
    this.currentModel = conv.model || null;

    this.elements.providerSelect.value = this.currentProvider;
    this.populateModelSelector();
    if (this.currentModel) this.elements.modelSelect.value = this.currentModel;

    this.renderMessages(conv.messages);
  }

  loadConversationList() {
    const conversations = this.loadConversations();
    const sorted = Object.values(conversations).sort((a, b) =>
      new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );

    if (sorted.length === 0) {
      this.elements.conversationList.innerHTML = '<div class="no-convs">No conversations yet</div>';
      return;
    }

    this.elements.conversationList.innerHTML = sorted.map(conv => `
      <div class="conversation-item ${conv.id === this.activeConversationId ? 'active' : ''}" data-id="${conv.id}">
        <div class="conv-title">${conv.title || 'New conversation'}</div>
        <div class="conv-meta">${conv.provider} \u00b7 ${conv.model || ''}</div>
        <button class="conv-delete" data-id="${conv.id}" title="Delete">&times;</button>
      </div>
    `).join('');

    this.elements.conversationList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.conv-delete')) return;
        this.loadConversation(item.dataset.id);
      });
    });

    this.elements.conversationList.querySelectorAll('.conv-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.deleteConversation(btn.dataset.id);
      });
    });
  }

  deleteConversation(id) {
    const conversations = this.loadConversations();
    delete conversations[id];
    localStorage.setItem('conversations', JSON.stringify(conversations));
    if (id === this.activeConversationId) this.showWelcome();
    else this.loadConversationList();
  }

  filterConversations(query) {
    const items = this.elements.conversationList.querySelectorAll('.conversation-item');
    const q = query.toLowerCase().trim();
    items.forEach(item => {
      const title = item.querySelector('.conv-title')?.textContent?.toLowerCase() || '';
      const meta = item.querySelector('.conv-meta')?.textContent?.toLowerCase() || '';
      item.style.display = (!q || title.includes(q) || meta.includes(q)) ? '' : 'none';
    });
  }

  renderMessages(messages) {
    this.elements.chatMessages.innerHTML = '';
    if (!messages || messages.length === 0) { this.showWelcome(); return; }
    for (const msg of messages) this.addMessage(msg);
    // after rendering messages, ensure input is enabled
    if (this.elements && this.elements.chatInput) {
      this.elements.chatInput.removeAttribute('disabled');
      this.updateSendButton();
    }
    this.scrollToBottom();
  }

  exportConversations() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 1,
      conversations: this.loadConversations(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-platform-conversations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.addSystemMessage('Conversations exported');
  }

  importConversations(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.conversations || typeof data.conversations !== 'object') throw new Error('Invalid format');
        const existing = this.loadConversations();
        Object.assign(existing, data.conversations);
        localStorage.setItem('conversations', JSON.stringify(existing));
        this.loadConversationList();
        this.addSystemMessage(`Imported ${Object.keys(data.conversations).length} conversations`);
      } catch (err) {
        this.addSystemMessage(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  handleKeyboardShortcuts(e) {
    if (e.key === 'Escape') {
      if (!this.elements.settingsModal.classList.contains('hidden')) { this.hideSettings(); return; }
      if (!this.elements.localModelsPanel.classList.contains('hidden')) { this.hideLocalModels(); return; }
      if (!this.elements.mcpDashboardModal.classList.contains('hidden')) { this.hideMCPDashboard(); return; }
      if (this.editingMessageIndex >= 0) { this.cancelEdit(); return; }
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'n': e.preventDefault(); this.newConversation(); break;
        case 'e': e.preventDefault(); this.exportConversations(); break;
        case 'i': e.preventDefault(); this.elements.importInput.click(); break;
        case ',': e.preventDefault(); this.showSettings(); break;
        case 'l': e.preventDefault(); this.showLocalModels(); break;
        case 'm': e.preventDefault(); this.showMCPDashboard(); break;
        case 's': e.preventDefault(); this.showServers(); break;
        case 'delete':
        case 'd': e.preventDefault(); if (this.activeConversationId) this.deleteConversation(this.activeConversationId); break;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (this.editingMessageIndex >= 0) {
        e.preventDefault();
        this.sendMessage(this.elements.chatInput.value, this.editingMessageIndex);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new AIApp();
  } catch (err) {
    console.error('AI Platform initialization failed:', err);
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="message system error">
          <div style="color:var(--accent-danger);font-weight:700;margin-bottom:8px;">Failed to initialize AI Platform</div>
          <div style="font-size:13px;color:var(--text-muted);">${err.message}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-family:monospace;">${err.stack?.split('\n').slice(0,3).join('<br>') || ''}</div>
        </div>`;
    }
  }
});
