import { MCPServer } from './mcpServer.js';

export class SystemServer extends MCPServer {
  constructor() {
    super({
      name: 'System',
      version: '1.0.0',
      description: 'System information, environment, time, and utility tools',
    });
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('get_time', 'Get the current date and time in various timezones', {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone (e.g., UTC, America/New_York)', default: 'UTC' },
        format: { type: 'string', description: 'Output format (iso, unix, locale)', default: 'iso' },
      },
    }, async (args) => {
      const tz = args.timezone || 'UTC';
      const now = new Date();
      const options = { timeZone: tz };
      let text;
      switch (args.format) {
        case 'unix':
          text = `${Math.floor(now.getTime() / 1000)}`;
          break;
        case 'locale':
          text = now.toLocaleString('en-US', { ...options, dateStyle: 'full', timeStyle: 'long' });
          break;
        default:
          text = now.toISOString().replace('T', ' ').split('.')[0];
      }
      return {
        content: [{ type: 'text', text: `${text} (${tz})` }],
      };
    });

    this.addTool('get_environment', 'Get environment variable values', {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific keys to retrieve (empty = all safe ones)',
        },
      },
    }, async (args) => {
      const safeKeys = ['HOME', 'USER', 'SHELL', 'LANG', 'PATH', 'NODE_ENV', 'PWD', 'HOSTNAME', 'TERM'];
      let keys = args.keys || safeKeys;
      const env = {};
      for (const key of keys) {
        env[key] = process?.env?.[key] || '(not set)';
      }
      const resp = typeof window !== 'undefined'
        ? { platform: navigator.platform, userAgent: navigator.userAgent, language: navigator.language }
        : { platform: process.platform, arch: process.arch, nodeVersion: process.version };
      return {
        content: [{ type: 'text', text: JSON.stringify({ ...env, ...resp }, null, 2) }],
      };
    });

    this.addTool('generate_uuid', 'Generate one or more UUIDs (v4)', {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of UUIDs to generate', default: 1 },
      },
    }, async (args) => {
      const count = Math.min(args.count || 1, 100);
      const uuids = [];
      for (let i = 0; i < count; i++) {
        uuids.push(crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }));
      }
      return { content: [{ type: 'text', text: uuids.join('\n') }] };
    });

    this.addTool('hash_text', 'Generate a hash of the input text', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to hash' },
        algorithm: { type: 'string', description: 'Hash algorithm (sha256, md5, sha1)', default: 'sha256' },
      },
      required: ['text'],
    }, async (args) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(args.text);
      let hash;
      if (args.algorithm === 'md5') {
        hash = this._md5(args.text);
      } else {
        const algo = args.algorithm === 'sha1' ? 'SHA-1' : 'SHA-256';
        const buf = await crypto.subtle.digest(algo, data);
        hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      return { content: [{ type: 'text', text: `${args.algorithm.toUpperCase()}: ${hash}` }] };
    });

    this.addTool('calculate', 'Evaluate a mathematical expression', {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate' },
      },
      required: ['expression'],
    }, async (args) => {
      const sanitized = args.expression.replace(/[^0-9+\-*/.()%\s]/g, '');
      try {
        const result = Function(`"use strict"; return (${sanitized})`)();
        return { content: [{ type: 'text', text: `${args.expression} = ${result}` }] };
      } catch {
        return { content: [{ type: 'text', text: `Cannot evaluate: ${args.expression}` }] };
      }
    });

    this.addTool('encode_decode', 'Encode or decode text in various formats', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to process' },
        operation: {
          type: 'string',
          description: 'Operation to perform',
          enum: ['base64-encode', 'base64-decode', 'uri-encode', 'uri-decode', 'json-parse', 'json-stringify'],
        },
      },
      required: ['text', 'operation'],
    }, async (args) => {
      let result;
      switch (args.operation) {
        case 'base64-encode':
          result = btoa(args.text);
          break;
        case 'base64-decode':
          result = atob(args.text);
          break;
        case 'uri-encode':
          result = encodeURIComponent(args.text);
          break;
        case 'uri-decode':
          result = decodeURIComponent(args.text);
          break;
        case 'json-parse':
          try { result = JSON.stringify(JSON.parse(args.text), null, 2); }
          catch { result = 'Invalid JSON'; }
          break;
        case 'json-stringify':
          result = JSON.stringify(args.text);
          break;
        default:
          result = `Unknown operation: ${args.operation}`;
      }
      return { content: [{ type: 'text', text: result }] };
    });

    this.addTool('list_timezones', 'List common IANA timezones', {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filter timezones by region (e.g., America, Europe)' },
      },
    }, async (args) => {
      const timezones = Intl.supportedValuesOf('timeZone');
      const filtered = args.filter
        ? timezones.filter(tz => tz.toLowerCase().startsWith(args.filter.toLowerCase()))
        : timezones;
      return {
        content: [{ type: 'text', text: filtered.join('\n') }],
        meta: { total: timezones.length, shown: filtered.length },
      };
    });
  }

  _md5(str) {
    const md5cycle = (x, k) => {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    };
    const add32 = (a, b) => (a + b) & 0xFFFFFFFF;
    const cmn = (q, a, b, x, s, t) => add32((add32(a, q) + add32(x, t)) << s | (add32(a, q) + add32(x, t)) >>> (32 - s), b);
    const ff = (a, b, c, d, x, s, t) => cmn((b & c) | ((~b) & d), a, b, x, s, t);
    const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & (~d)), a, b, x, s, t);
    const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);
    const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | (~d)), a, b, x, s, t);
    const str2binl = (s) => {
      const bin = Array(s.length >> 2).fill(0);
      for (let i = 0; i < s.length * 8; i += 8) bin[i >> 5] |= (s.charCodeAt(i / 8) & 255) << (i % 32);
      return bin;
    };
    const binl2hex = (bin) => Array.from(bin, x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
    const x = str2binl(unescape(encodeURIComponent(str)));
    x[x.length] = str.length * 8;
    x.push(0);
    const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
    for (let i = 0; i < x.length; i += 16) md5cycle(h, x.slice(i, i + 16));
    return binl2hex(h);
  }

  _registerResources() {
    this.addResource('system://info', 'System Information', 'Basic system information', () => ({
      contents: [{
        uri: 'system://info',
        text: JSON.stringify({
          platform: typeof window !== 'undefined' ? 'browser' : 'node',
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : process.version,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }, null, 2),
      }],
    }));
  }
}
