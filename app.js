import { ThemeManager } from './themes/themeManager.js';
import { CONFIG, getApiKey, setApiKey } from './config.js';
import { MCPPipeline } from './mcp/mcpPipeline.js';
import { LocalModelScanner } from './localScanner.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { AnthropicProvider } from './providers/anthropicProvider.js';
import { GoogleProvider } from './providers/googleProvider.js';
import { LocalProvider } from './providers/localProvider.js';

class AIApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.mcpPipeline = new MCPPipeline();
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

    this.init();
  }

  init() {
    this.cacheDom();
    this.bindEvents();
    this.syncThemeSelector();
    this.populateProviderSelector();
    this.populateModelSelector();
    this.loadConversationList();
    this.promptForApiKeys();
    this.registerMCPListener();
    this.registerLocalScanListener();
    this.scanLocalModels();
    this.loadConversation(this.activeConversationId);
  }

  cacheDom() {
    this.elements = {
      providerSelect: document.getElementById('provider-select'),
      modelSelect: document.getElementById('model-select'),
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
      modelInfo: document.getElementById('model-info'),
      tokenCount: document.getElementById('token-count'),
      exportBtn: document.getElementById('export-btn'),
      importBtn: document.getElementById('import-btn'),
      importInput: document.getElementById('import-input'),
      searchInput: document.getElementById('search-input'),
      shortcutHint: document.getElementById('shortcut-hint'),
      editToolbar: document.getElementById('edit-toolbar'),
      editCancelBtn: document.getElementById('edit-cancel-btn'),
    };
  }

  bindEvents() {
    this.elements.providerSelect.addEventListener('change', () => this.onProviderChange());
    this.elements.modelSelect.addEventListener('change', () => this.onModelChange());
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
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

    document.addEventListener('keydown', e => this.handleKeyboardShortcuts(e));

    document.addEventListener('click', e => {
      if (e.target === this.elements.settingsModal) this.hideSettings();
      if (e.target === this.elements.localModelsPanel) this.hideLocalModels();
    });

    this.elements.chatMessages.addEventListener('click', e => {
      const messageEl = e.target.closest('.message.editable');
      if (messageEl) this.startEditMessage(messageEl);
    });
  }

  syncThemeSelector() {
    this.elements.themeSelect.value = this.themeManager.getCurrentTheme();
    this.themeManager.onChange(theme => { this.elements.themeSelect.value = theme; });
  }

  registerMCPListener() {
    this.mcpPipeline.onChange(event => {
      if (event.type === 'block') {
        this.updateMCPStatus('blocked', event.plugin);
      } else if (event.type === 'allowed') {
        const allPassed = Object.values(event.results).every(r => r.passed !== false || r.action === 'redact');
        this.updateMCPStatus(allPassed ? 'active' : 'warning');
      }
    });
  }

  updateMCPStatus(state, detail) {
    const el = this.elements.mcpStatus;
    el.className = 'mcp-indicator';
    if (state === 'blocked') {
      el.classList.add('blocked');
      el.textContent = `BLOCKED: ${detail || 'MCP'}`;
      el.title = `Request blocked by ${detail}`;
    } else if (state === 'warning') {
      el.classList.add('warning');
      el.textContent = 'MCP: Flagged';
      el.title = 'Some MCP checks flagged content';
    } else {
      el.classList.add('active');
      el.textContent = 'MCP';
      el.title = 'All MCP security checks passed';
    }
  }

  registerLocalScanListener() {
    this.localScanner.onModelsChange(() => {
      if (this.currentProvider === 'local') this.populateModelSelector();
    });
  }

  populateProviderSelector() {
    this.elements.providerSelect.innerHTML = Object.entries(CONFIG.providers)
      .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
      .join('');
    this.elements.providerSelect.value = this.currentProvider;
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

    this.elements.modelSelect.innerHTML = models.map(id =>
      `<option value="${id}" ${id === this.currentModel || (!this.currentModel && id === config.defaultModel) ? 'selected' : ''}>
        ${id}${isLocal && this.localScanner.getModels().find(m => m.id === id) ? '  (local)' : ''}
      </option>`
    ).join('');

    if (!this.currentModel) {
      this.currentModel = this.elements.modelSelect.value;
    }
    this.updateModelInfo();
  }

  onProviderChange() {
    this.currentProvider = this.elements.providerSelect.value;
    this.currentModel = null;
    this.populateModelSelector();
    this.checkApiKey();
    this.addSystemMessage(`Switched to ${CONFIG.providers[this.currentProvider].name}`);
  }

  onModelChange() {
    this.currentModel = this.elements.modelSelect.value;
    this.updateModelInfo();
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

    const mcpResult = await this.mcpPipeline.processInput(text, {
      provider: this.currentProvider,
      model: this.currentModel,
      requestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    if (!mcpResult.passed) {
      this.hideTyping();
      this.elements.stopBtn.classList.add('hidden');
      this.addSystemMessage(`Blocked by ${mcpResult.blockedBy}: ${mcpResult.message}`, 'error');
      return;
    }

    const processedText = mcpResult.message || text;
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
      const conversationMessages = this.messageHistory.map(m => ({ role: m.role, content: m.content }));
      const startTime = performance.now();
      let fullContent = '';
      let streamedMessage = null;

      const stream = await provider.stream(this.currentModel, conversationMessages, {
        signal: this.abortController.signal,
      });

      this.hideTyping();

      try {
        for await (const chunk of stream) {
          if (this.abortController?.signal.aborted) break;
          fullContent += chunk;

          if (!streamedMessage) {
            streamedMessage = {
              role: 'assistant',
              content: '',
              model: this.currentModel,
              provider: this.currentProvider,
              timestamp: new Date().toISOString(),
            };
            this.addStreamingMessage(streamedMessage);
          }

          this.updateStreamingContent(fullContent);
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.message?.includes('abort') || this.abortController?.signal.aborted) {
          this.addSystemMessage('Generation stopped', 'warning');
        } else {
          throw err;
        }
      }

      if (this.abortController?.signal.aborted && !fullContent) {
        this.isGenerating = false;
        this.elements.stopBtn.classList.add('hidden');
        this.abortController = null;
        return;
      }

      const latency = performance.now() - startTime;

      if (streamedMessage) {
        streamedMessage.content = fullContent;
        streamedMessage.latency = latency;
      }

      this.isGenerating = false;
      this.elements.stopBtn.classList.add('hidden');
      this.abortController = null;

      const outputResult = await this.mcpPipeline.processOutput(fullContent, {
        provider: this.currentProvider,
        model: this.currentModel,
        latency,
        finishReason: 'stop',
      });

      if (streamedMessage) {
        streamedMessage.content = outputResult.response || fullContent;
        this.finalizeStreamingMessage(streamedMessage);
        this.messageHistory.push(streamedMessage);
      }

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

  addStreamingMessage(message) {
    const div = document.createElement('div');
    div.className = 'message assistant streaming';
    div.id = 'streaming-message';

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = `${CONFIG.providers[this.currentProvider]?.name || 'AI'} · ${this.currentModel}`;

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = '';

    div.appendChild(header);
    div.appendChild(content);

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
    if (cursor) {
      content.textContent = text;
      content.appendChild(cursor);
    } else {
      content.textContent = text + '\u2588';
    }
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

    const footerParts = [];
    if (message.latency) footerParts.push(`${(message.latency / 1000).toFixed(1)}s`);
    if (message.usage) {
      if (message.usage.inputTokens || message.usage.outputTokens) {
        footerParts.push(`${message.usage.inputTokens || '?'} in / ${message.usage.outputTokens || '?'} out`);
      } else if (message.usage.promptTokens || message.usage.candidatesTokens) {
        footerParts.push(`${message.usage.promptTokens || '?'} in / ${message.usage.candidatesTokens || '?'} out`);
      }
    }
    if (footerParts.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'message-footer';
      footer.textContent = footerParts.join(' · ');
      div.appendChild(footer);
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
    const index = Array.from(this.elements.chatMessages.querySelectorAll('.message.user')).indexOf(messageEl);
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
    this.elements.editToolbar.querySelector('.edit-context').textContent =
      `Editing message ${index + 1}`;
  }

  hideEditToolbar() {
    this.elements.editToolbar.classList.add('hidden');
    this.elements.editToolbar.querySelector('.edit-context').textContent = '';
  }

  cancelEdit() {
    this.editingMessageIndex = -1;
    this.elements.chatInput.value = '';
    this.hideEditToolbar();
    this.updateSendButton();
  }

  clearMessagesAfter(index) {
    const userMessages = this.elements.chatMessages.querySelectorAll('.message.user');
    const startRemove = userMessages[index];
    if (!startRemove) return;
    let el = startRemove.nextElementSibling;
    while (el) {
      const next = el.nextElementSibling;
      el.remove();
      el = next;
    }
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
    if (this.elements.modelInfo) {
      this.elements.modelInfo.textContent = `Model: ${this.currentModel || 'None'} · ${CONFIG.providers[this.currentProvider]?.name || ''}`;
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
        this.addSystemMessage(`Welcome! Configure API keys in Settings (gear icon) for: ${missing.map(([_, p]) => p.name).join(', ')}`, 'info');
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

    const connHtml = Object.entries(status).map(([name, s]) =>
      `<span class="conn-status ${s.online ? 'online' : 'offline'}">${name}: ${s.online ? 'Online' : 'Offline'}</span>`
    ).join(' | ');

    if (models.length === 0) {
      this.elements.localModelsList.innerHTML = `
        <div class="conn-info">${connHtml}</div>
        <div class="no-models">No local models detected. Start Ollama or LM Studio.</div>
      `;
      return;
    }

    const modelsHtml = models.map(m => `
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
        <button class="use-model-btn" data-model="${m.id}">Use This Model</button>
      </div>
    `).join('');

    this.elements.localModelsList.innerHTML = `<div class="conn-info">${connHtml}</div>${modelsHtml}`;

    this.elements.localModelsList.querySelectorAll('.use-model-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentProvider = 'local';
        this.elements.providerSelect.value = 'local';
        this.currentModel = btn.dataset.model;
        this.populateModelSelector();
        this.elements.modelSelect.value = btn.dataset.model;
        this.onProviderChange();
        this.hideLocalModels();
        this.addSystemMessage(`Using local model: ${btn.dataset.model}`);
      });
    });
  }

  newConversation() {
    this.stopGeneration();
    this.cancelEdit();
    this.activeConversationId = `conv_${Date.now()}`;
    this.messageHistory = [];
    this.elements.chatMessages.innerHTML = `
      <div class="message system welcome">
        <div class="welcome-title">AI Platform</div>
        <div class="welcome-subtitle">Select a provider and model, then start chatting.</div>
      </div>
    `;
    this.saveCurrentConversation();
    this.loadConversationList();
    this.elements.chatInput.focus();
    this.updateModelInfo();
  }

  saveCurrentConversation() {
    if (!this.activeConversationId) return;
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
    if (!id) { this.newConversation(); return; }
    const conversations = this.loadConversations();
    const conv = conversations[id];
    if (!conv) { this.newConversation(); return; }

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
        <div class="conv-meta">${conv.provider} · ${conv.model || ''}</div>
        <button class="conv-delete" data-id="${conv.id}" title="Delete conversation">&times;</button>
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
    if (id === this.activeConversationId) {
      this.newConversation();
    } else {
      this.loadConversationList();
    }
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
    if (!messages || messages.length === 0) { this.newConversation(); return; }
    for (const msg of messages) this.addMessage(msg);
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
        if (!data.conversations || typeof data.conversations !== 'object') {
          throw new Error('Invalid format');
        }
        const existing = this.loadConversations();
        const merged = { ...existing, ...data.conversations };
        localStorage.setItem('conversations', JSON.stringify(merged));
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
      if (this.editingMessageIndex >= 0) { this.cancelEdit(); return; }
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          this.newConversation();
          break;
        case 'e':
          e.preventDefault();
          this.exportConversations();
          break;
        case 'i':
          e.preventDefault();
          this.elements.importInput.click();
          break;
        case ',':
          e.preventDefault();
          this.showSettings();
          break;
        case 'l':
          e.preventDefault();
          this.showLocalModels();
          break;
        case 'delete':
        case 'd':
          e.preventDefault();
          if (this.activeConversationId) this.deleteConversation(this.activeConversationId);
          break;
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
  window.app = new AIApp();
});
