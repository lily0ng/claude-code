import { CONFIG } from '../config.js';

export class PromptInjectionMCP {
  constructor() {
    this.name = 'PromptInjectionMCP';
    this.enabled = CONFIG.mcp.promptInjection.enabled;
    this.threshold = CONFIG.mcp.promptInjection.threshold;
    this.patterns = [
      { regex: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|directions|commands)/i, weight: 0.9, label: 'ignore-previous' },
      { regex: /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|directions|commands)/i, weight: 0.9, label: 'disregard-previous' },
      { regex: /forget\s+(everything|all\s+previous)/i, weight: 0.85, label: 'forget-context' },
      { regex: /you\s+(are\s+)?(now|are\s+free|don't\s+have\s+to)/i, weight: 0.7, label: 'role-manipulation' },
      { regex: /new\s+(instructions|directions|commands?)\s*:\s*/i, weight: 0.6, label: 'new-instructions' },
      { regex: /system\s*(prompt|message|instruction)\s*:/i, weight: 0.5, label: 'system-override' },
      { regex: /you're\s+not\s+(required|obligated|bound)/i, weight: 0.65, label: 'constraint-removal' },
      { regex: /output\s+(only|just|simply)\s+(the\s+)?json/i, weight: 0.3, label: 'output-format-manipulation' },
      { regex: /DAN|do\s+anything\s+now/i, weight: 0.95, label: 'dan-mode' },
      { regex: /jailbreak/i, weight: 1.0, label: 'jailbreak' },
      { regex: /pretend\s+(to\s+)?(be|you\s+are)/i, weight: 0.5, label: 'pretend-role' },
      { regex: /hypothetical:\s*(ignore|bypass|override)/i, weight: 0.75, label: 'hypothetical-bypass' },
    ];
  }

  async processInput(message) {
    if (!this.enabled) return { passed: true, score: 0, findings: [] };

    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const findings = [];

    for (const pattern of this.patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        findings.push({
          pattern: pattern.label,
          match: match[0].substring(0, 100),
          weight: pattern.weight,
          index: match.index,
        });
      }
    }

    const totalScore = findings.length > 0
      ? Math.min(1, findings.reduce((sum, f) => sum + f.weight, 0) / Math.max(1, findings.length) * Math.min(findings.length, 5) / 5)
      : 0;

    const passed = totalScore < this.threshold;

    return {
      passed,
      score: totalScore,
      threshold: this.threshold,
      findings,
      action: passed ? 'allow' : 'block',
      message: passed
        ? 'Prompt injection check passed'
        : `Prompt injection detected (score: ${totalScore.toFixed(2)}, threshold: ${this.threshold})`,
    };
  }

  async processOutput(response) {
    return { passed: true, modified: false };
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      threshold: this.threshold,
      patternCount: this.patterns.length,
    };
  }
}
