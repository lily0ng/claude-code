import { MCPServer } from './mcpServer.js';

const isNode = typeof process !== 'undefined' && process.versions?.node;

class VirtualFS {
  constructor() {
    this.files = new Map();
    this.dirs = new Set(['/']);
  }

  _normalize(p) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    const resolved = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { resolved.pop(); continue; }
      resolved.push(part);
    }
    return '/' + resolved.join('/');
  }

  _ensureDir(p) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc += '/' + part;
      this.dirs.add(acc);
    }
  }

  readFile(path, encoding) {
    path = this._normalize(path);
    if (!this.files.has(path)) throw new Error(`ENOENT: ${path}`);
    const data = this.files.get(path);
    return encoding === 'base64' ? btoa(data) : data;
  }

  writeFile(path, content) {
    path = this._normalize(path);
    this._ensureDir(path);
    this.files.set(path, content);
  }

  deleteFile(path) {
    path = this._normalize(path);
    if (this.dirs.has(path) && path !== '/') {
      const hasChildren = [...this.files.keys()].some(k => k.startsWith(path + '/'));
      if (hasChildren) throw new Error(`ENOTEMPTY: ${path}`);
      this.dirs.delete(path);
      return;
    }
    if (!this.files.has(path)) throw new Error(`ENOENT: ${path}`);
    this.files.delete(path);
  }

  deleteRecursive(path) {
    path = this._normalize(path);
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(path + '/')) this.files.delete(key);
    }
    for (const key of [...this.dirs.keys()]) {
      if (key === path || (key.startsWith(path + '/') && key !== '/')) this.dirs.delete(key);
    }
  }

  stat(path) {
    path = this._normalize(path);
    const isDir = this.dirs.has(path);
    const isFile = this.files.has(path);
    if (!isDir && !isFile) throw new Error(`ENOENT: ${path}`);
    return {
      size: isFile ? this.files.get(path).length : 0,
      isDirectory: isDir,
      isFile,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      mode: isDir ? '40755' : '100644',
    };
  }

  readdir(path) {
    path = this._normalize(path);
    const entries = [];
    const seen = new Set();
    for (const key of this.files.keys()) {
      if (key === path) continue;
      if (key.startsWith(path + '/')) {
        const rel = key.slice(path.length + 1);
        const name = rel.split('/')[0];
        if (!seen.has(name)) { seen.add(name); entries.push({ name, isDirectory: false }); }
      }
    }
    for (const key of this.dirs) {
      if (key === path) continue;
      if (key.startsWith(path + '/')) {
        const rel = key.slice(path.length + 1);
        const name = rel.split('/')[0];
        if (!seen.has(name)) { seen.add(name); entries.push({ name, isDirectory: true }); }
      }
    }
    return entries;
  }

  searchFiles(root, pattern, maxDepth) {
    root = this._normalize(root);
    const results = [];
    const searchStr = pattern.replace('*', '').toLowerCase();
    for (const key of this.files.keys()) {
      if (!key.startsWith(root)) continue;
      const rel = key.slice(root.length).replace(/^\//, '');
      const depth = rel.split('/').filter(Boolean).length;
      if (depth > maxDepth) continue;
      const name = key.split('/').pop();
      if (name.toLowerCase().includes(searchStr)) results.push(key);
    }
    return results;
  }
}

export class FileSystemServer extends MCPServer {
  constructor() {
    super({
      name: 'FileSystem',
      version: '1.0.0',
      description: isNode
        ? 'Read, write, list, and manage files on the local filesystem'
        : 'In-memory virtual filesystem (browser mode)',
    });
    this.vfs = new VirtualFS();
    this._registerFileTools();
    this._registerFileResources();
  }

  async _readFileNode(path, encoding) {
    const { readFile } = await import('fs/promises');
    const data = await readFile(path, encoding || 'utf-8');
    return { content: [{ type: 'text', text: data }] };
  }

  async _writeFileNode(path, content) {
    const { writeFile, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');
    return { content: [{ type: 'text', text: `File written: ${path} (${content.length} bytes)` }] };
  }

  async _listDirNode(path, pattern) {
    const { readdir } = await import('fs/promises');
    const { join } = await import('path');
    const entries = await readdir(path, { withFileTypes: true });
    let results = entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other',
      path: join(path, e.name),
    }));
    if (pattern) {
      results = results.filter(e => {
        try { return new RegExp(pattern.replace(/\*/g, '.*')).test(e.name); }
        catch { return e.name.includes(pattern.replace('*', '')); }
      });
    }
    return { content: [{ type: 'text', text: results.map(r => `${r.type === 'directory' ? '[DIR]' : '[FILE]'} ${r.name}`).join('\n') }] };
  }

  async _fileInfoNode(path) {
    const { stat } = await import('fs/promises');
    const info = await stat(path);
    return { content: [{ type: 'text', text: JSON.stringify({
      size: info.size,
      isDirectory: info.isDirectory(),
      isFile: info.isFile(),
      created: info.birthtime,
      modified: info.mtime,
      permissions: info.mode.toString(8),
    }, null, 2) }] };
  }

  async _deleteFileNode(path, recursive) {
    const { unlink, rm } = await import('fs/promises');
    if (recursive) {
      await rm(path, { recursive: true, force: true });
    } else {
      await unlink(path);
    }
    return { content: [{ type: 'text', text: `Deleted: ${path}` }] };
  }

  async _searchFilesNode(root, pattern, maxDepth) {
    const { resolve, join } = await import('path');
    const rootPath = resolve(root);
    const files = [];
    const searchStr = pattern.replace('*', '').toLowerCase();
    async function walk(dir, depth) {
      if (depth > maxDepth) return;
      const { readdir } = await import('fs/promises');
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); }
      catch { return; }
      for (const e of entries) {
        const fullPath = join(dir, e.name);
        if (e.name.startsWith('.')) continue;
        if (e.isDirectory()) await walk(fullPath, depth + 1);
        else if (e.name.toLowerCase().includes(searchStr)) files.push(fullPath);
      }
    }
    await walk(rootPath, 0);
    return { content: [{ type: 'text', text: files.length > 0 ? files.join('\n') : 'No matching files found' }] };
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
      if (isNode) return this._readFileNode(args.path, args.encoding);
      const text = this.vfs.readFile(args.path, args.encoding);
      return { content: [{ type: 'text', text }] };
    });

    this.addTool('list_directory', 'List files and directories in a path', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        pattern: { type: 'string', description: 'Glob/filename pattern to filter (e.g., *.js)' },
      },
      required: ['path'],
    }, async (args) => {
      if (isNode) return this._listDirNode(args.path, args.pattern);
      const entries = this.vfs.readdir(args.path);
      let display = entries.map(e => `${e.isDirectory ? '[DIR]' : '[FILE]'} ${e.name}`);
      if (args.pattern) {
        const pat = args.pattern.replace('*', '');
        display = display.filter(d => d.toLowerCase().includes(pat.toLowerCase()));
      }
      return { content: [{ type: 'text', text: display.join('\n') || '(empty directory)' }] };
    });

    this.addTool('write_file', 'Write content to a file (creates if not exists)', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to write to' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    }, async (args) => {
      if (isNode) return this._writeFileNode(args.path, args.content);
      this.vfs.writeFile(args.path, args.content);
      return { content: [{ type: 'text', text: `File written: ${args.path} (${args.content.length} bytes) [virtual]` }] };
    });

    this.addTool('file_info', 'Get metadata about a file or directory', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file or directory' },
      },
      required: ['path'],
    }, async (args) => {
      if (isNode) return this._fileInfoNode(args.path);
      const info = this.vfs.stat(args.path);
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    });

    this.addTool('delete_file', 'Delete a file or empty directory', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to delete' },
        recursive: { type: 'boolean', description: 'Recursively delete directories', default: false },
      },
      required: ['path'],
    }, async (args) => {
      if (isNode) return this._deleteFileNode(args.path, args.recursive);
      if (args.recursive) {
        this.vfs.deleteRecursive(args.path);
      } else {
        this.vfs.deleteFile(args.path);
      }
      return { content: [{ type: 'text', text: `Deleted: ${args.path}` }] };
    });

    this.addTool('search_files', 'Search for files matching a pattern', {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Root directory to search' },
        pattern: { type: 'string', description: 'Filename glob or substring pattern' },
        maxDepth: { type: 'number', description: 'Maximum directory depth', default: 5 },
      },
      required: ['root', 'pattern'],
    }, async (args) => {
      const maxDepth = args.maxDepth || 5;
      if (isNode) return this._searchFilesNode(args.root, args.pattern, maxDepth);
      const files = this.vfs.searchFiles(args.root, args.pattern, maxDepth);
      return { content: [{ type: 'text', text: files.length > 0 ? files.join('\n') : 'No matching files found' }] };
    });
  }

  _registerFileResources() {
    this.addResource('filesystem://cwd', 'Current Working Directory', 'The current working directory path', () => ({
      contents: [{ uri: 'filesystem://cwd', text: isNode ? process.cwd() : '/virtual' }],
    }));

    this.addResource('filesystem://home', 'Home Directory', 'User home directory path', () => ({
      contents: [{
        uri: 'filesystem://home',
        text: isNode ? (process.env.HOME || process.env.USERPROFILE || '/home') : '/virtual/home',
      }],
    }));
  }
}
