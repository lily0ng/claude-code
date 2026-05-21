export class MCPRegistry {
  constructor() {
    this.plugins = new Map();
    this.categories = new Map();
    this.hooks = { beforeRegister: [], afterRegister: [], beforeProcess: [], afterProcess: [] };
  }

  register(plugin, options = {}) {
    const name = plugin.name || plugin.constructor?.name;
    if (this.plugins.has(name)) {
      console.warn(`MCP plugin "${name}" already registered, skipping`);
      return this;
    }

    this.runHook('beforeRegister', { plugin, options });

    const entry = {
      plugin,
      name,
      category: options.category || plugin.category || 'general',
      enabled: options.enabled !== undefined ? options.enabled : true,
      priority: options.priority || 0,
      metadata: plugin.getMetadata ? plugin.getMetadata() : {},
      registeredAt: Date.now(),
      health: { ok: true, lastCheck: null, errors: 0 },
    };

    this.plugins.set(name, entry);

    if (!this.categories.has(entry.category)) {
      this.categories.set(entry.category, []);
    }
    this.categories.get(entry.category).push(name);

    this.runHook('afterRegister', { entry });

    return this;
  }

  unregister(name) {
    const entry = this.plugins.get(name);
    if (!entry) return false;
    this.plugins.delete(name);
    const cat = this.categories.get(entry.category);
    if (cat) {
      const idx = cat.indexOf(name);
      if (idx >= 0) cat.splice(idx, 1);
      if (cat.length === 0) this.categories.delete(entry.category);
    }
    return true;
  }

  get(name) {
    return this.plugins.get(name);
  }

  getAll() {
    return Array.from(this.plugins.values());
  }

  getEnabled() {
    return this.getAll().filter(e => e.enabled);
  }

  getByCategory(category) {
    return (this.categories.get(category) || [])
      .map(name => this.plugins.get(name))
      .filter(Boolean);
  }

  getCategories() {
    return Array.from(this.categories.keys());
  }

  setEnabled(name, enabled) {
    const entry = this.plugins.get(name);
    if (entry) entry.enabled = enabled;
  }

  setPriority(name, priority) {
    const entry = this.plugins.get(name);
    if (entry) entry.priority = priority;
  }

  on(hook, fn) {
    if (this.hooks[hook]) {
      this.hooks[hook].push(fn);
    }
    return () => {
      this.hooks[hook] = this.hooks[hook].filter(h => h !== fn);
    };
  }

  runHook(hook, data) {
    for (const fn of (this.hooks[hook] || [])) {
      try { fn(data); } catch (err) { console.error(`MCP hook "${hook}" error:`, err); }
    }
  }

  getInputPlugins() {
    return this.getEnabled().sort((a, b) => a.priority - b.priority);
  }

  getOutputPlugins() {
    return this.getEnabled().sort((a, b) => a.priority - b.priority);
  }

  async checkHealth() {
    const results = [];
    for (const [name, entry] of this.plugins) {
      try {
        if (entry.plugin.checkHealth) {
          const ok = await entry.plugin.checkHealth();
          entry.health = { ok, lastCheck: new Date(), errors: ok ? 0 : (entry.health.errors + 1) };
        } else {
          entry.health = { ok: true, lastCheck: new Date(), errors: 0 };
        }
      } catch {
        entry.health = { ok: false, lastCheck: new Date(), errors: entry.health.errors + 1 };
      }
      results.push({ name, health: entry.health });
    }
    return results;
  }

  autoConfigure(context = {}) {
    for (const entry of this.getAll()) {
      if (entry.plugin.autoConfigure) {
        try {
          entry.plugin.autoConfigure(context);
        } catch (err) {
          console.warn(`Auto-config failed for "${entry.name}":`, err);
        }
      }
    }
  }

  toJSON() {
    return {
      pluginCount: this.plugins.size,
      categories: Array.from(this.categories.keys()),
      plugins: this.getAll().map(e => ({
        name: e.name,
        category: e.category,
        enabled: e.enabled,
        priority: e.priority,
        health: e.health,
      })),
    };
  }
}
