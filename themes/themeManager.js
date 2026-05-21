import { CONFIG } from '../config.js';

export class ThemeManager {
  constructor(options = {}) {
    this.currentTheme = localStorage.getItem('app_theme') || CONFIG.themes.default;
    this.availableThemes = CONFIG.themes.list;
    this.listeners = [];
    this.loadedSheets = new Set();

    this.scanExistingLinks();
    this.init();
  }

  scanExistingLinks() {
    document.querySelectorAll('link[rel="stylesheet"][href*="themes/"]').forEach(link => {
      const match = link.href.match(/themes\/(\w+)\.css/);
      if (match) this.loadedSheets.add(match[1]);
    });
  }

  init() {
    if (!this.loadedSheets.has(this.currentTheme)) {
      this.loadThemeSheet(this.currentTheme);
    }
    this.applyTheme(this.currentTheme);
  }

  loadThemeSheet(theme) {
    if (this.loadedSheets.has(theme)) return null;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `themes/${theme}.css`;
    link.dataset.theme = theme;
    link.onload = () => {
      this.loadedSheets.add(theme);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme && bg) metaTheme.content = bg;
    };
    link.onerror = () => console.warn(`Failed to load theme: ${theme}`);
    document.head.appendChild(link);
    return link;
  }

  getAvailableThemes() {
    return this.availableThemes.map(name => ({
      name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      isActive: name === this.currentTheme,
    }));
  }

  applyTheme(theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Theme "${theme}" not found, falling back to default`);
      theme = CONFIG.themes.default;
    }
    this.loadThemeSheet(theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('theme-transition');
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 400);
    this.currentTheme = theme;
    localStorage.setItem('app_theme', theme);
    this.notify(theme);
  }

  setTheme(theme) {
    if (theme === this.currentTheme) return;
    this.applyTheme(theme);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDark() {
    const darkThemes = ['dark', 'nord', 'dracula', 'cyberpunk', 'solarized'];
    return darkThemes.includes(this.currentTheme);
  }

  onChange(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(theme) {
    for (const listener of this.listeners) {
      try { listener(theme); } catch (err) { console.error('Theme listener error:', err); }
    }
  }

  getThemeVariables() {
    const style = getComputedStyle(document.documentElement);
    return {
      bgPrimary: style.getPropertyValue('--bg-primary').trim(),
      textPrimary: style.getPropertyValue('--text-primary').trim(),
      accentPrimary: style.getPropertyValue('--accent-primary').trim(),
      fontMono: style.getPropertyValue('--font-mono').trim(),
      radiusMd: style.getPropertyValue('--radius-md').trim(),
    };
  }
}
