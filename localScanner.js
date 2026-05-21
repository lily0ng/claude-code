import { CONFIG } from './config.js';

export class LocalModelScanner {
  constructor() {
    this.ollamaEndpoint = CONFIG.providers.local.endpoints.ollama;
    this.lmStudioEndpoint = CONFIG.providers.local.endpoints.lmStudio;
    this.scannedModels = [];
    this.lastScan = null;
    this.scanInterval = null;
    this.listeners = [];
    this.status = {
      ollama: { online: false, lastChecked: null },
      lmStudio: { online: false, lastChecked: null },
    };
  }

  async scan() {
    const results = [];
    const errors = [];

    const [ollamaModels, ollamaOk] = await this.scanOllama();
    const [lmStudioModels, lmStudioOk] = await this.scanLmStudio();

    if (ollamaOk) {
      results.push(...ollamaModels);
      this.status.ollama = { online: true, lastChecked: new Date() };
    } else {
      this.status.ollama = { online: false, lastChecked: new Date() };
    }

    if (lmStudioOk) {
      results.push(...lmStudioModels);
      this.status.lmStudio = { online: true, lastChecked: new Date() };
    } else {
      this.status.lmStudio = { online: false, lastChecked: new Date() };
    }

    this.scannedModels = results;
    this.lastScan = new Date();
    this.notify(results);

    return { models: results, status: this.status, lastScan: this.lastScan };
  }

  async scanOllama() {
    try {
      const resp = await fetch(`${this.ollamaEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return [[], false];

      const data = await resp.json();
      const models = (data.models || []).map(m => ({
        id: m.name,
        name: m.name,
        provider: 'ollama',
        source: 'Ollama',
        size: this.formatSize(m.size),
        sizeBytes: m.size,
        modifiedAt: m.modified_at,
        digest: m.digest?.substring(0, 12) || '',
        details: {
          family: m.details?.family || 'unknown',
          parameterSize: m.details?.parameter_size || 'unknown',
          quantizationLevel: m.details?.quantization_level || 'unknown',
        },
        metadata: {
          endpoint: this.ollamaEndpoint,
          type: 'local',
        },
      }));

      return [models, true];
    } catch {
      return [[], false];
    }
  }

  async scanLmStudio() {
    try {
      const resp = await fetch(`${this.lmStudioEndpoint}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return [[], false];

      const data = await resp.json();
      const models = (data.data || []).map(m => ({
        id: m.id,
        name: m.id.split('/').pop() || m.id,
        provider: 'lm-studio',
        source: 'LM Studio',
        size: this.formatSize(m.size || m.max_model_len || 0),
        sizeBytes: m.size || 0,
        ownedBy: m.owned_by || 'local',
        permissions: m.permissions || [],
        details: {
          family: m.object || 'model',
          parameterSize: 'unknown',
          quantizationLevel: 'unknown',
        },
        metadata: {
          endpoint: this.lmStudioEndpoint,
          type: 'local',
        },
      }));

      return [models, true];
    } catch {
      return [[], false];
    }
  }

  async scanEndpoint(url, parser) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) return [];
      const data = await resp.json();
      return parser(data);
    } catch {
      return [];
    }
  }

  getModels(options = {}) {
    let models = [...this.scannedModels];
    if (options.provider) models = models.filter(m => m.provider === options.provider);
    if (options.search) {
      const q = options.search.toLowerCase();
      models = models.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    }
    if (options.sortBy) {
      models.sort((a, b) => {
        const aVal = a[options.sortBy] || '';
        const bVal = b[options.sortBy] || '';
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      });
    }
    return models;
  }

  getStatus() {
    return {
      ...this.status,
      modelCount: this.scannedModels.length,
      lastScan: this.lastScan,
      isScanning: this.isScanning || false,
    };
  }

  startAutoScan(intervalMs = 30000) {
    this.stopAutoScan();
    this.scan();
    this.scanInterval = setInterval(() => this.scan(), intervalMs);
  }

  stopAutoScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  onModelsChange(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(models) {
    for (const listener of this.listeners) {
      try { listener(models, this.status); } catch (err) { console.error('Scanner listener error:', err); }
    }
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  destroy() {
    this.stopAutoScan();
    this.listeners = [];
    this.scannedModels = [];
  }
}
