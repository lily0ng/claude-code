import { CONFIG } from '../config.js';

export class PIIDetectionMCP {
  constructor() {
    this.name = 'PIIDetectionMCP';
    this.enabled = CONFIG.mcp.piiDetection.enabled;
    this.severity = CONFIG.mcp.piiDetection.severity;
    this.patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCard: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
      ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      apiKey: /(?:sk-[a-zA-Z0-9]{20,}|key-[a-zA-Z0-9]{16,}|AIza[0-9A-Za-z_-]{35})/g,
      jwt: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      bitcoin: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
      ethAddress: /\b0x[a-fA-F0-9]{40}\b/g,
      passportNumber: /\b[A-Z]{1,2}\d{6,9}\b/g,
      zipCode: /\b\d{5}(?:-\d{4})?\b/g,
    };
    this.redactionMap = {
      email: '[EMAIL REDACTED]',
      phone: '[PHONE REDACTED]',
      ssn: '[SSN REDACTED]',
      creditCard: '[CREDIT CARD REDACTED]',
      ipAddress: '[IP ADDRESS REDACTED]',
      apiKey: '[API KEY REDACTED]',
      jwt: '[JWT REDACTED]',
      bitcoin: '[BITCOIN ADDRESS REDACTED]',
      ethAddress: '[ETH ADDRESS REDACTED]',
      passportNumber: '[PASSPORT REDACTED]',
      zipCode: '[ZIP CODE REDACTED]',
    };
  }

  async processInput(message, options = {}) {
    if (!this.enabled) return { passed: true, redacted: false, findings: [] };

    const text = typeof message === 'string' ? message : (message?.content || message?.text || '');
    const findings = [];
    const redactMode = options.redact !== false;

    let redactedText = text;

    for (const [type, regex] of Object.entries(this.patterns)) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        findings.push({
          type,
          value: redactMode ? this.redactionMap[type] : match[0],
          index: match.index,
          length: match[0].length,
          severity: this.getSeverity(type),
        });
      }

      if (redactMode) {
        redactedText = redactedText.replace(regex, this.redactionMap[type]);
      }
    }

    const highSeverityCount = findings.filter(f => f.severity === 'high').length;
    const passed = this.severity === 'high' ? highSeverityCount === 0 : findings.length === 0;

    return {
      passed,
      redacted: redactMode && findings.length > 0,
      redactedText: redactMode ? redactedText : text,
      findings,
      action: passed ? 'allow' : (redactMode ? 'redact' : 'block'),
      message: findings.length === 0
        ? 'No PII detected'
        : `Found ${findings.length} PII ${findings.length === 1 ? 'instance' : 'instances'} (${findings.map(f => f.type).join(', ')})`,
    };
  }

  async processOutput(response) {
    return this.processInput(response, { redact: true });
  }

  getSeverity(type) {
    const high = ['ssn', 'creditCard', 'apiKey', 'jwt', 'passportNumber'];
    const medium = ['email', 'phone', 'bitcoin', 'ethAddress'];
    return high.includes(type) ? 'high' : medium.includes(type) ? 'medium' : 'low';
  }

  getMetadata() {
    return {
      name: this.name,
      enabled: this.enabled,
      severity: this.severity,
      patternCount: Object.keys(this.patterns).length,
    };
  }
}
