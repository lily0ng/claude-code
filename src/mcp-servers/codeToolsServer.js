import { MCPServer } from './mcpServer.js';

export class CodeToolsServer extends MCPServer {
  constructor() {
    super({
      name: 'CodeTools',
      version: '1.0.0',
      description: 'Code analysis, formatting, linting, and transformation tools',
    });
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('format_json', 'Format, validate, and prettify JSON', {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'JSON string to format' },
        indentSize: { type: 'number', description: 'Indentation size', default: 2 },
      },
      required: ['json'],
    }, async (args) => {
      try {
        const parsed = JSON.parse(args.json);
        const formatted = JSON.stringify(parsed, null, args.indentSize || 2);
        return { content: [{ type: 'text', text: formatted }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Invalid JSON: ${err.message}` }], isError: true };
      }
    });

    this.addTool('count_lines', 'Count lines, words, and characters in text', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
      },
      required: ['text'],
    }, async (args) => {
      const lines = args.text.split('\n');
      const nonEmpty = lines.filter(l => l.trim().length > 0);
      const words = args.text.split(/\s+/).filter(Boolean);
      return {
        content: [{ type: 'text', text: JSON.stringify({
          totalLines: lines.length,
          nonEmptyLines: nonEmpty.length,
          words: words.length,
          characters: args.text.length,
          charactersNoSpaces: args.text.replace(/\s/g, '').length,
          avgLineLength: lines.length > 0 ? Math.round(args.text.length / lines.length) : 0,
        }, null, 2) }],
      };
    });

    this.addTool('diff_text', 'Compute a line-by-line diff between two texts', {
      type: 'object',
      properties: {
        oldText: { type: 'string', description: 'Original text' },
        newText: { type: 'string', description: 'New text' },
        context: { type: 'number', description: 'Context lines around changes', default: 2 },
      },
      required: ['oldText', 'newText'],
    }, async (args) => {
      const oldLines = args.oldText.split('\n');
      const newLines = args.newText.split('\n');
      const result = [];
      const maxLen = Math.max(oldLines.length, newLines.length);
      let inDiff = false;
      let skipCounter = 0;

      for (let i = 0; i < maxLen; i++) {
        if (oldLines[i] !== newLines[i]) {
          if (!inDiff) {
            if (skipCounter > 0 && skipCounter <= (args.context || 2)) {
              for (let j = i - skipCounter; j < i; j++) {
                result.push(` ${oldLines[j] || ''}`);
              }
            }
            skipCounter = 0;
            inDiff = true;
          }
          if (oldLines[i] !== undefined) result.push(`- ${oldLines[i]}`);
          if (newLines[i] !== undefined) result.push(`+ ${newLines[i] || ''}`);
        } else {
          if (inDiff) {
            inDiff = false;
            skipCounter = 0;
          }
          skipCounter++;
          if (skipCounter > (args.context || 2)) {
            result.push(`@@ ${i + 1} @@`);
            skipCounter = -999;
          }
        }
      }
      return { content: [{ type: 'text', text: result.join('\n') || 'No differences' }] };
    });

    this.addTool('extract_code_blocks', 'Extract code blocks from markdown text', {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'Markdown text containing code blocks' },
      },
      required: ['markdown'],
    }, async (args) => {
      const blocks = [];
      const regex = /```(\w*)\n([\s\S]*?)```/g;
      let match;
      while ((match = regex.exec(args.markdown)) !== null) {
        blocks.push({ language: match[1] || 'text', code: match[2].trim(), index: match.index });
      }
      if (blocks.length === 0) {
        return { content: [{ type: 'text', text: 'No code blocks found' }] };
      }
      return {
        content: [{
          type: 'text',
          text: blocks.map((b, i) => `[${i + 1}] ${b.language} (${b.code.length} chars)\n${'='.repeat(30)}\n${b.code}`).join('\n\n'),
        }],
        meta: { count: blocks.length },
      };
    });

    this.addTool('case_convert', 'Convert text between different case formats', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to convert' },
        format: {
          type: 'string',
          description: 'Target case format',
          enum: ['camel', 'pascal', 'snake', 'kebab', 'upper', 'lower', 'title', 'sentence'],
        },
      },
      required: ['text', 'format'],
    }, async (args) => {
      const words = args.text.split(/[_\-\s]+/).filter(Boolean);
      let result;
      switch (args.format) {
        case 'camel':
          result = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          break;
        case 'pascal':
          result = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          break;
        case 'snake':
          result = words.map(w => w.toLowerCase()).join('_');
          break;
        case 'kebab':
          result = words.map(w => w.toLowerCase()).join('-');
          break;
        case 'upper':
          result = args.text.toUpperCase();
          break;
        case 'lower':
          result = args.text.toLowerCase();
          break;
        case 'title':
          result = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          break;
        case 'sentence':
          result = words.join(' ');
          result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
          break;
        default:
          result = args.text;
      }
      return { content: [{ type: 'text', text: result }] };
    });

    this.addTool('tokenize', 'Estimate token count for AI model input', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to tokenize' },
        model: { type: 'string', description: 'Target model type (gpt, claude, gemini)', default: 'gpt' },
      },
      required: ['text'],
    }, async (args) => {
      const text = args.text;
      const charCount = text.length;
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      let estimatedTokens;
      switch (args.model) {
        case 'claude':
          estimatedTokens = Math.round(charCount / 3.5);
          break;
        case 'gemini':
          estimatedTokens = Math.round(charCount / 4.2);
          break;
        default:
          estimatedTokens = Math.round(charCount / 4);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            characters: charCount,
            words: wordCount,
            estimatedTokens,
            model: args.model || 'gpt',
          }, null, 2),
        }],
      };
    });

    this.addTool('regex_test', 'Test a regular expression against text', {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern' },
        text: { type: 'string', description: 'Text to test against' },
        flags: { type: 'string', description: 'Regex flags (g, i, m)', default: 'g' },
      },
      required: ['pattern', 'text'],
    }, async (args) => {
      try {
        const regex = new RegExp(args.pattern, args.flags || 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(args.text)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            value: match[0],
            groups: match.groups || null,
          });
          if (match.index === regex.lastIndex) regex.lastIndex++;
        }
        return {
          content: [{ type: 'text', text: matches.length > 0
            ? JSON.stringify({ matchCount: matches.length, matches }, null, 2)
            : 'No matches found'
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Invalid regex: ${err.message}` }], isError: true };
      }
    });

    this.addTool('sort_lines', 'Sort and optionally deduplicate lines of text', {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text with lines to sort' },
        unique: { type: 'boolean', description: 'Remove duplicate lines', default: false },
        reverse: { type: 'boolean', description: 'Sort in reverse order', default: false },
        numeric: { type: 'boolean', description: 'Sort numerically', default: false },
      },
      required: ['text'],
    }, async (args) => {
      let lines = args.text.split('\n');
      if (args.unique) lines = [...new Set(lines)];
      if (args.numeric) {
        lines.sort((a, b) => {
          const na = parseFloat(a) || 0;
          const nb = parseFloat(b) || 0;
          return args.reverse ? nb - na : na - nb;
        });
      } else {
        lines.sort((a, b) => args.reverse ? b.localeCompare(a) : a.localeCompare(b));
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    });
  }

  _registerResources() {
    this.addResource('codetools://info', 'CodeTools Info', 'Information about available code tools', () => ({
      contents: [{
        uri: 'codetools://info',
        text: JSON.stringify({
          tools: ['format_json', 'count_lines', 'diff_text', 'extract_code_blocks', 'case_convert', 'tokenize', 'regex_test', 'sort_lines'],
          version: '1.0.0',
        }, null, 2),
      }],
    }));
  }
}
