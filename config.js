export const CONFIG = {
  providers: {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      defaultModel: 'gpt-4',
      endpoint: 'https://api.openai.com/v1',
      envKey: 'OPENAI_API_KEY',
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      defaultModel: 'claude-3-opus-20240229',
      endpoint: 'https://api.anthropic.com/v1',
      envKey: 'ANTHROPIC_API_KEY',
    },
    google: {
      name: 'Google',
      models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-pro'],
      defaultModel: 'gemini-1.5-pro-latest',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      envKey: 'GOOGLE_API_KEY',
    },
    local: {
      name: 'Local / Ollama',
      models: ['llama3:70b', 'llama3:8b', 'mistral-large', 'mixtral:8x7b', 'codellama:34b'],
      defaultModel: 'llama3:70b',
      endpoints: {
        ollama: 'http://localhost:11434',
        lmStudio: 'http://localhost:1234',
      },
    },
  },
  mcp: {
    promptInjection: { enabled: true, threshold: 0.7 },
    piiDetection: { enabled: true, severity: 'high' },
    contentModeration: { enabled: true, categories: ['hate', 'harassment', 'self-harm', 'sexual', 'violence'] },
    auditLog: { enabled: true, logLevel: 'info' },
  },
  themes: {
    default: 'dark',
    list: ['dark', 'light', 'solarized', 'nord', 'dracula', 'cyberpunk'],
  },
  security: {
    maxRetries: 3,
    requestTimeout: 30000,
    rateLimitPerMinute: 60,
  },
};

export function getApiKey(provider) {
  const key = CONFIG.providers[provider]?.envKey;
  if (!key) return null;
  const envPattern = new RegExp(`^\\$\\{${key}\\}$`);
  const stored = localStorage.getItem(`api_key_${provider}`);
  if (stored) return stored;
  const fromEnv = process?.env?.[key];
  if (fromEnv) return fromEnv;
  return null;
}

export function setApiKey(provider, key) {
  localStorage.setItem(`api_key_${provider}`, key);
}
