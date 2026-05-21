import { MCPServer } from './mcpServer.js';

export class WebSearchServer extends MCPServer {
  constructor() {
    super({
      name: 'WebSearch',
      version: '1.0.0',
      description: 'Search the web, fetch URLs, and extract content',
    });
    this._registerTools();
    this._registerResources();
  }

  _registerTools() {
    this.addTool('web_search', 'Search the web for information', {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Maximum number of results', default: 5 },
      },
      required: ['query'],
    }, async (args) => {
      if (typeof window === 'undefined') {
        return { content: [{ type: 'text', text: 'Web search only available in browser' }] };
      }
      try {
        const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const html = await resp.text();
        const results = [];
        const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        let count = 0;
        while ((match = resultRegex.exec(html)) !== null && count < (args.maxResults || 5)) {
          results.push({ url: match[1], title: match[2].replace(/<[^>]+>/g, '').trim() });
          count++;
        }
        return {
          content: [{
            type: 'text',
            text: results.length > 0
              ? results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join('\n\n')
              : 'No results found',
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Search failed: ${err.message}` }] };
      }
    });

    this.addTool('fetch_url', 'Fetch the content of a URL', {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        format: { type: 'string', description: 'Response format (text, html, json)', default: 'text' },
      },
      required: ['url'],
    }, async (args) => {
      try {
        const resp = await fetch(args.url, {
          headers: { 'User-Agent': 'AI-Platform-MCP/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

        if (args.format === 'json') {
          const data = await resp.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        const text = await resp.text();
        const stripped = args.format === 'html' ? text : text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        return {
          content: [{ type: 'text', text: stripped.substring(0, 10000) }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Fetch failed: ${err.message}` }] };
      }
    });

    this.addTool('extract_links', 'Extract all links from a URL', {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to extract links from' },
      },
      required: ['url'],
    }, async (args) => {
      try {
        const resp = await fetch(args.url, { signal: AbortSignal.timeout(10000) });
        const html = await resp.text();
        const links = [];
        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          links.push({ href: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() });
        }
        return {
          content: [{ type: 'text', text: links.map(l => `[${l.text || l.href}](${l.href})`).join('\n') }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Link extraction failed: ${err.message}` }] };
      }
    });

    this.addTool('check_url', 'Check if a URL is accessible and get its status', {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to check' },
      },
      required: ['url'],
    }, async (args) => {
      try {
        const resp = await fetch(args.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              url: args.url,
              statusCode: resp.status,
              statusText: resp.statusText,
              ok: resp.ok,
              contentType: resp.headers.get('content-type'),
              contentLength: resp.headers.get('content-length'),
              lastModified: resp.headers.get('last-modified'),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `URL check failed: ${err.message}` }] };
      }
    });
  }

  _registerResources() {
    this.addResource('websearch://status', 'WebSearch Status', 'Current web search engine status', () => ({
      contents: [{
        uri: 'websearch://status',
        text: JSON.stringify({
          engine: 'DuckDuckGo HTML',
          available: typeof window !== 'undefined',
          features: ['web_search', 'fetch_url', 'extract_links', 'check_url'],
        }, null, 2),
      }],
    }));
  }
}
