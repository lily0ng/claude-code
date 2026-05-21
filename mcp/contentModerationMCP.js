import { CONFIG } from '../config.js';

export class ContentModerationMCP {
  constructor() {
    this.name = 'ContentModerationMCP';
    this.enabled = CONFIG.mcp.contentModeration.enabled;
    this.categories = CONFIG.mcp.contentModeration.categories;
    this.lastResult = null;
    this.patterns = {
      hate: {
        patterns: [
          /\b(hate|hateful|bigot|racist|misogyn(ist|y)|xenophob(ic|e)|homophob(ic|e)|transphob(ic|e))\b/i,
          /\b(superior\s+(race|ethnicity|gender)|inferior\s+(race|ethnicity|gender))\b/i,
          /\b(exterminat|eliminat|cleans(e|ing))\s+(the\s+)?(group|race|people|religion)\b/i,
        ],
        threshold: 0.8,
      },
      harassment: {
        patterns: [
          /\b(kill\s+(yourself|yourselves)|go\s+(die|kill\s+yourself)|end\s+yourself)\b/i,
          /\b(dox|doxx|harass|bully|targeted\s+harassment)\b/i,
          /\b(threat(en)?|endanger)\s+(to\s+)?(harm|hurt|kill|attack)\b/i,
        ],
        threshold: 0.7,
      },
      selfHarm: {
        patterns: [
          /\b(suicide|kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life)\b/i,
          /\b(self[\s-]?(harm|injur)|cut(t?ing)?\s+myself)\b/i,
          /\b(suicid(al|e)|want\s+to\s+die|better\s+off\s+dead)\b/i,
        ],
        threshold: 0.6,
      },
      sexual: {
        patterns: [
          /\b(sexual\s+(content|explicit|material)|sexually\s+explicit)\b/i,
          /\b(pornograph(y|ic)|explicit\s+sexual|nsfw)\b/i,
          /\b(sexting|sexual\s+act|sexual\s+intercour|genital|explicit\s+nude)\b/i,
        ],
        threshold: 0.8,
      },
      violence: {
        patterns: [
          /\b(physically\s+(harm|attack|assault)|graphic\s+violence)\b/i,
          /\b(torture|brutal\s+(attack|murder|kill|assault)|massacre)\b/i,
          /\b(terroris(m|t|tic)|bomb\s+(threat|attack)|active\s+shooter)\b/i,
        ],
        threshold: 0.7,
      },
    };
  }

  async processInput(message) {
    if (!this.enabled) {
      this.lastResult = { passed: true, scores: {}, findings: [] };
      return this.lastResult;
    }

    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const findings = [];
    const scores = {};

    for (const [category, config] of Object.entries(this.patterns)) {
      if (!this.categories.includes(category)) continue;
      let categoryFindings = 0;

      for (const regex of config.patterns) {
        const matches = text.match(regex);
        if (matches) {
          categoryFindings += matches.length;
          for (const match of matches) {
            findings.push({
              category,
              match: match.substring(0, 100),
              severity: Math.min(1, categoryFindings / config.patterns.length),
            });
          }
        }
      }

      scores[category] = Math.min(1, categoryFindings / 3);
    }

    const maxScore = Object.values(scores).length > 0 ? Math.max(...Object.values(scores)) : 0;
    const passed = maxScore < 0.5;

    this.lastResult = {
      passed,
      scores,
      maxScore,
      findings,
      action: passed ? 'allow' : 'block',
      message: passed
        ? 'Content moderation passed'
        : `Content blocked: ${Object.entries(scores).filter(([, s]) => s > 0.5).map(([c]) => c).join(', ')}`,
    };

    return this.lastResult;
  }

  async processOutput(response) {
    return this.processInput(response);
  }

  getLastResult() {
    return this.lastResult;
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      categories: this.categories,
    };
  }
}
