import { MCPServer } from './mcpServer.js';

export class FileSystemServer extends MCPServer {
  constructor() {
    super({
      name: 'FileSystem',
      version: '1.0.0',
      description: 'Read, write, list, and manage files on the local filesystem',
    });
    this._registerFileTools();
    this._registerFileResources();
  }

  _registerFileTools() {
    this.addTool('read_file', 'Read the contents of a file', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        encoding: { type: 'string', description: 'File encoding (utf-8, base64)', default: 'utf-8' },
      },
      required: ['path'],
    }, async (args) => {
      const resp = await fetch(`file://${args.path}`);
      if (!resp.ok) throw new Error(`Failed to read file: ${resp.statusText}`);
      const text = await resp.text();
      return { content: [{ type: 'text', text }] };
    });

    this.addTool('list_directory', 'List files and directories in a path', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        pattern: { type: 'string', description: 'Glob pattern to filter (e.g., *.js)' },
      },
      required: ['path'],
    }, async (args) => {
      const { readdir } = await import('fs/promises');
      const { join } = await import('path');
      const entries = await readdir(args.path, { withFileTypes: true });
      let results = entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other',
        path: join(args.path, e.name),
      }));
      if (args.pattern) {
        const { minimatch } = await import('minimatch');
        results = results.filter(e => minimatch(e.name, args.pattern));
      }
      return {
        content: [{ type: 'text', text: results.map(r => `${r.type === 'directory' ? '[DIR]' : '[FILE]'} ${r.name}`).join('\n') }],
      };
    });

    this.addTool('write_file', 'Write content to a file (creates if not exists)', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to write to' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    }, async (args) => {
      const { writeFile, mkdir } = await import('fs/promises');
      const { dirname } = await import('path');
      await mkdir(dirname(args.path), { recursive: true });
      await writeFile(args.path, args.content, 'utf-8');
      return { content: [{ type: 'text', text: `File written: ${args.path} (${args.content.length} bytes)` }] };
    });

    this.addTool('file_info', 'Get metadata about a file or directory', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file or directory' },
      },
      required: ['path'],
    }, async (args) => {
      const { stat } = await import('fs/promises');
      const info = await stat(args.path);
      return {
        content: [{ type: 'text', text: JSON.stringify({
          size: info.size,
          isDirectory: info.isDirectory(),
          isFile: info.isFile(),
          created: info.birthtime,
          modified: info.mtime,
          permissions: info.mode.toString(8),
        }, null, 2) }],
      };
    });

    this.addTool('delete_file', 'Delete a file or empty directory', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to delete' },
        recursive: { type: 'boolean', description: 'Recursively delete directories', default: false },
      },
      required: ['path'],
    }, async (args) => {
      const { unlink, rm } = await import('fs/promises');
      if (args.recursive) {
        await rm(args.path, { recursive: true, force: true });
      } else {
        await unlink(args.path);
      }
      return { content: [{ type: 'text', text: `Deleted: ${args.path}` }] };
    });

    this.addTool('search_files', 'Search for files matching a pattern', {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Root directory to search' },
        pattern: { type: 'string', description: 'Filename glob pattern' },
        maxDepth: { type: 'number', description: 'Maximum directory depth', default: 5 },
      },
      required: ['root', 'pattern'],
    }, async (args) => {
      const { resolve } = await import('path');
      const root = resolve(args.root);
      const files = [];
      async function walk(dir, depth) {
        if (depth > (args.maxDepth || 5)) return;
        const { readdir } = await import('fs/promises');
        const { join } = await import('path');
        let entries;
        try { entries = await readdir(dir, { withFileTypes: true }); }
        catch { return; }
        for (const e of entries) {
          const fullPath = join(dir, e.name);
          if (e.name.startsWith('.')) continue;
          if (e.isDirectory()) await walk(fullPath, depth + 1);
          else if (e.name.includes(args.pattern.replace('*', ''))) files.push(fullPath);
        }
      }
      await walk(root, 0);
      return {
        content: [{ type: 'text', text: files.length > 0 ? files.join('\n') : 'No matching files found' }],
      };
    });
  }

  _registerFileResources() {
    this.addResource('filesystem://cwd', 'Current Working Directory', 'The current working directory path', () => ({
      contents: [{ uri: 'filesystem://cwd', text: process.cwd() }],
    }));

    this.addResource('filesystem://home', 'Home Directory', 'User home directory path', () => ({
      contents: [{
        uri: 'filesystem://home',
        text: process.env.HOME || process.env.USERPROFILE || '/home',
      }],
    }));
  }
}
