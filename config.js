export const CONFIG = {
  providers: {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o3-mini'],
      defaultModel: 'gpt-4o',
      endpoint: 'https://api.openai.com/v1',
      envKey: 'OPENAI_API_KEY',
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      defaultModel: 'claude-sonnet-4-20250514',
      endpoint: 'https://api.anthropic.com/v1',
      envKey: 'ANTHROPIC_API_KEY',
    },
    google: {
      name: 'Google',
      models: ['gemini-2.5-pro-exp-03-25', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
      defaultModel: 'gemini-2.0-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      envKey: 'GOOGLE_API_KEY',
    },
    local: {
      name: 'Local / Ollama',
      models: ['llama3.2', 'llama3.2:3b', 'llama3.1:8b', 'llama3:70b', 'mistral', 'mixtral:8x7b', 'codellama:34b', 'deepseek-r1:7b', 'qwen2.5:7b'],
      defaultModel: 'llama3.2',
      endpoints: { ollama: 'http://localhost:11434', lmStudio: 'http://localhost:1234' },
    },
  },
  mcp: {
    promptInjection: { enabled: true, threshold: 0.7, category: 'security' },
    piiDetection: { enabled: true, severity: 'high', category: 'privacy' },
    contentModeration: { enabled: true, categories: ['hate', 'harassment', 'self-harm', 'sexual', 'violence'], category: 'moderation' },
    auditLog: { enabled: true, logLevel: 'info', category: 'observability' },
    rateLimit: { enabled: true, maxRequests: 30, windowMs: 60000, category: 'security' },
    tokenBudget: { enabled: true, maxTokensPerSession: 100000, warningThreshold: 0.8, category: 'cost' },
    inputValidation: { enabled: true, maxMessageLength: 32000, maxMessagesPerConversation: 500, category: 'security' },
    modelGating: { enabled: true, restrictedCategories: ['self-harm', 'violence'], category: 'compliance' },
    cache: { enabled: true, ttlMs: 300000, maxEntries: 200, category: 'performance' },
  },
  mcpAutomation: {
    healthCheckInterval: 30000,
    autoEnableByContext: true,
    reportOnEachRequest: true,
    maxToolRounds: 5,
  },
  mcpServers: {
    autoStart: true,
    defaultServers: ['FileSystem', 'WebSearch', 'Database', 'System', 'CodeTools', 'GeminiProvider', 'OpenAIProvider', 'AnthropicProvider', 'LocalProvider'],
    serverSettings: {
      FileSystem: { enabled: true, maxFileSize: 1048576 },
      WebSearch: { enabled: true, timeout: 10000 },
      Database: { enabled: true, maxTableRows: 10000 },
      System: { enabled: true },
      CodeTools: { enabled: true, maxInputSize: 50000 },
      GeminiProvider: { enabled: true, timeout: 30000 },
      OpenAIProvider: { enabled: true, timeout: 30000 },
      AnthropicProvider: { enabled: true, timeout: 30000 },
      LocalProvider: { enabled: true, timeout: 60000 },
    },
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
  const stored = localStorage.getItem(`api_key_${provider}`);
  if (stored) return stored;
  const fromEnv = process?.env?.[key];
  if (fromEnv) return fromEnv;
  return null;
}

export function setApiKey(provider, key) {
  localStorage.setItem(`api_key_${provider}`, key);
}
