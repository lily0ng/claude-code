import { CONFIG } from '../config.js';

const MODEL_RESTRICTIONS = {
  'gpt-4': { maxTokens: 8192, allowedCategories: ['general', 'code', 'creative'] },
  'gpt-4-turbo': { maxTokens: 128000, allowedCategories: ['general', 'code', 'creative', 'analysis'] },
  'gpt-4o': { maxTokens: 128000, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'gpt-4o-mini': { maxTokens: 128000, allowedCategories: ['general', 'code', 'creative', 'analysis'] },
  'gpt-3.5-turbo': { maxTokens: 16384, allowedCategories: ['general', 'code'] },
  'o1': { maxTokens: 100000, allowedCategories: ['general', 'code', 'analysis', 'research'] },
  'o3-mini': { maxTokens: 100000, allowedCategories: ['general', 'code', 'analysis'] },
  'claude-3-opus-20240229': { maxTokens: 200000, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'claude-3-sonnet-20240229': { maxTokens: 200000, allowedCategories: ['general', 'code', 'creative', 'analysis'] },
  'claude-3-haiku-20240307': { maxTokens: 200000, allowedCategories: ['general', 'code'] },
  'claude-3-5-sonnet-20241022': { maxTokens: 200000, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'claude-sonnet-4-20250514': { maxTokens: 200000, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'gemini-1.5-pro': { maxTokens: 1048576, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'gemini-1.5-flash': { maxTokens: 1048576, allowedCategories: ['general', 'code', 'analysis'] },
  'gemini-1.5-flash-8b': { maxTokens: 1048576, allowedCategories: ['general', 'code'] },
  'gemini-2.0-flash': { maxTokens: 1048576, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'gemini-2.0-flash-lite': { maxTokens: 1048576, allowedCategories: ['general', 'code', 'analysis'] },
  'gemini-2.5-pro-exp-03-25': { maxTokens: 1048576, allowedCategories: ['general', 'code', 'creative', 'analysis', 'research'] },
  'llama3.2': { maxTokens: 8192, allowedCategories: ['general', 'code'] },
  'llama3.2:3b': { maxTokens: 8192, allowedCategories: ['general', 'code'] },
  'llama3.1:8b': { maxTokens: 8192, allowedCategories: ['general', 'code', 'creative'] },
  'llama3:70b': { maxTokens: 8192, allowedCategories: ['general', 'code', 'creative'] },
  'llama3:8b': { maxTokens: 8192, allowedCategories: ['general', 'code'] },
  'mistral': { maxTokens: 32768, allowedCategories: ['general', 'code', 'analysis'] },
  'mistral-large': { maxTokens: 32768, allowedCategories: ['general', 'code', 'analysis'] },
  'mixtral:8x7b': { maxTokens: 32768, allowedCategories: ['general', 'code', 'creative'] },
  'codellama:34b': { maxTokens: 16384, allowedCategories: ['general', 'code'] },
  'deepseek-r1:7b': { maxTokens: 32768, allowedCategories: ['general', 'code', 'analysis'] },
  'qwen2.5:7b': { maxTokens: 32768, allowedCategories: ['general', 'code', 'creative'] },
};

const CONTENT_CATEGORIES = {
  'self-harm': 'restricted',
  'violence': 'restricted',
  'hate': 'restricted',
  'sexual': 'sensitive',
  'general': 'allowed',
  'code': 'allowed',
  'analysis': 'allowed',
  'creative': 'allowed',
  'research': 'allowed',
};

export class ModelGatingMCP {
  constructor() {
    this.name = 'ModelGatingMCP';
    this.category = 'compliance';
    this.enabled = CONFIG.mcp.modelGating.enabled;
    this.restrictedCategories = CONFIG.mcp.modelGating.restrictedCategories;
    this.lastResult = null;
  }

  async processInput(message, context = {}) {
    if (!this.enabled) {
      this.lastResult = { passed: true };
      return this.lastResult;
    }

    const model = context.model || 'unknown';
    const provider = context.provider || 'unknown';
    const findings = [];

    const restrictions = MODEL_RESTRICTIONS[model];
    if (!restrictions && provider !== 'local') {
      findings.push({ reason: `No restriction profile for model "${model}"`, severity: 'low' });
    }

    const restrictionsResult = restrictions || { allowedCategories: ['general', 'code'], maxTokens: 4096 };

    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens > restrictionsResult.maxTokens) {
      findings.push({
        reason: `Message (${estimatedTokens} tokens) exceeds model max (${restrictionsResult.maxTokens})`,
        severity: 'high',
      });
    }

    for (const cat of this.restrictedCategories) {
      const catConfig = CONFIG.mcp.contentModeration.categories.includes(cat)
        ? { patterns: this.getPatternsForCategory(cat) }
        : null;

      if (catConfig?.patterns) {
        for (const regex of catConfig.patterns) {
          if (regex.test(text)) {
            findings.push({ reason: `Content matches restricted category: ${cat}`, severity: 'high' });
            break;
          }
        }
      }
    }

    const passed = !findings.some(f => f.severity === 'high');

    this.lastResult = {
      passed,
      model,
      provider,
      estimatedTokens,
      maxTokens: restrictionsResult.maxTokens,
      findings,
      action: passed ? 'allow' : 'block',
      message: passed
        ? `Model gate passed for ${model}`
        : `Model gate blocked: ${findings.filter(f => f.severity === 'high').map(f => f.reason).join('; ')}`,
    };

    return this.lastResult;
  }

  getPatternsForCategory(category) {
    const patterns = {
      'self-harm': [
        /\b(suicide|kill\s+myself|self[\s-]?harm|cut(t?ing)?\s+myself)\b/i,
        /\b(suicid(al|e)|want\s+to\s+die|end\s+my\s+life)\b/i,
      ],
      'violence': [
        /\b(torture|brutal\s+(attack|murder)|massacre|terroris(m|t))\b/i,
        /\b(bomb\s+(threat|attack)|active\s+shooter|physically\s+(harm|attack))\b/i,
      ],
    };
    return patterns[category] || [];
  }

  async processOutput(response) {
    return { passed: true };
  }

  getLastResult() {
    return this.lastResult;
  }

  static getModelRestrictions(model) {
    return MODEL_RESTRICTIONS[model] || null;
  }

  static getModelList() {
    return Object.entries(MODEL_RESTRICTIONS).map(([model, config]) => ({
      model,
      maxTokens: config.maxTokens,
      categories: config.allowedCategories,
    }));
  }

  autoConfigure(context = {}) {
    if (context.restrictedCategories) this.restrictedCategories = context.restrictedCategories;
  }

  checkHealth() {
    return true;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      restrictedCategories: this.restrictedCategories,
      trackedModels: Object.keys(MODEL_RESTRICTIONS).length,
    };
  }
}
