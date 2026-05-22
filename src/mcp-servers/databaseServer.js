import { MCPServer } from './mcpServer.js';

export class DatabaseServer extends MCPServer {
  constructor() {
    super({
      name: 'Database',
      version: '1.0.0',
      description: 'Execute SQL queries, manage in-memory database, and analyze data',
    });
    this.tables = new Map();
    this._initMetadata();
    this._registerTools();
    this._registerResources();
  }

  _initMetadata() {
    this.tables.set('_metadata', {
      name: '_metadata',
      columns: ['key', 'value', 'updated_at'],
      rows: [
        ['version', '1.0.0', new Date().toISOString()],
        ['created', new Date().toISOString(), new Date().toISOString()],
      ],
    });
  }

  _registerTools() {
    this.addTool('create_table', 'Create a new in-memory table', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Table name' },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Column names',
        },
      },
      required: ['name', 'columns'],
    }, async (args) => {
      if (this.tables.has(args.name)) {
        throw new Error(`Table "${args.name}" already exists`);
      }
      this.tables.set(args.name, { name: args.name, columns: args.columns, rows: [] });
      return {
        content: [{ type: 'text', text: `Created table "${args.name}" with columns: ${args.columns.join(', ')}` }],
      };
    });

    this.addTool('insert_rows', 'Insert rows into a table', {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name' },
        rows: {
          type: 'array',
          items: { type: 'array' },
          description: 'Array of row values (matching column order)',
        },
      },
      required: ['table', 'rows'],
    }, async (args) => {
      const table = this.tables.get(args.table);
      if (!table) throw new Error(`Table "${args.table}" not found`);
      for (const row of args.rows) {
        if (row.length !== table.columns.length) {
          throw new Error(`Row has ${row.length} values but table has ${table.columns.length} columns`);
        }
        table.rows.push(row);
      }
      return {
        content: [{ type: 'text', text: `Inserted ${args.rows.length} row(s) into "${args.table}"` }],
      };
    });

    this.addTool('query', 'Query data from a table with filtering and sorting', {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name' },
        select: {
          type: 'array',
          items: { type: 'string' },
          description: 'Columns to return (default: all)',
        },
        where: { type: 'string', description: 'Filter expression (e.g., "age > 25")' },
        orderBy: { type: 'string', description: 'Column to sort by' },
        descending: { type: 'boolean', description: 'Sort descending', default: false },
        limit: { type: 'number', description: 'Max rows to return', default: 100 },
      },
      required: ['table'],
    }, async (args) => {
      const table = this.tables.get(args.table);
      if (!table) throw new Error(`Table "${args.table}" not found`);

      let rows = table.rows;
      const colIndex = (name) => table.columns.indexOf(name);
      const selectCols = args.select || table.columns;
      const selectIndices = selectCols.map(c => colIndex(c));

      if (args.where) {
        rows = rows.filter(row => {
          try {
            const ctx = {};
            table.columns.forEach((col, i) => { ctx[col] = row[i]; });
            return new Function(...table.columns, `return ${args.where}`)(...row);
          } catch {
            return true;
          }
        });
      }

      if (args.orderBy) {
        const idx = colIndex(args.orderBy);
        if (idx >= 0) {
          rows = [...rows].sort((a, b) => {
            const cmp = String(a[idx] ?? '').localeCompare(String(b[idx] ?? ''), undefined, { numeric: true });
            return args.descending ? -cmp : cmp;
          });
        }
      }

      rows = rows.slice(0, args.limit || 100);

      const result = [selectCols.join(' | '), selectCols.map(() => '---').join(' | ')];
      for (const row of rows) {
        result.push(selectIndices.map(i => String(row[i] ?? '')).join(' | '));
      }

      return {
        content: [{ type: 'text', text: result.join('\n') }],
        meta: { totalRows: table.rows.length, returnedRows: rows.length },
      };
    });

    this.addTool('list_tables', 'List all tables in the database', {
      type: 'object',
      properties: {},
    }, async () => {
      const tables = Array.from(this.tables.keys());
      const info = tables.map(name => {
        const t = this.tables.get(name);
        return `${name}: ${t.columns.length} cols, ${t.rows.length} rows`;
      });
      return {
        content: [{ type: 'text', text: info.join('\n') || 'No tables' }],
      };
    });

    this.addTool('delete_table', 'Delete a table and all its data', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Table name to delete' },
      },
      required: ['name'],
    }, async (args) => {
      if (args.name === '_metadata') throw new Error('Cannot delete metadata table');
      if (!this.tables.has(args.name)) throw new Error(`Table "${args.name}" not found`);
      this.tables.delete(args.name);
      return { content: [{ type: 'text', text: `Deleted table "${args.name}"` }] };
    });

    this.addTool('run_sql', 'Parse and execute a simple SQL-like query', {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL-like statement (SELECT, INSERT, CREATE TABLE)' },
      },
      required: ['sql'],
    }, async (args) => {
      const sql = args.sql.trim();
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
      if (selectMatch) {
        const table = this.tables.get(selectMatch[2]);
        if (!table) throw new Error(`Table "${selectMatch[2]}" not found`);
        const cols = selectMatch[1].trim() === '*' ? table.columns : selectMatch[1].split(',').map(c => c.trim());
        const where = selectMatch[3];
        return this._handleQuery({ table: selectMatch[2], select: cols, where });
      }

      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s+VALUES\s*\((.+?)\)/i);
      if (insertMatch) {
        const table = this.tables.get(insertMatch[1]);
        if (!table) throw new Error(`Table "${insertMatch[1]}" not found`);
        const values = insertMatch[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
        table.rows.push(values);
        return { content: [{ type: 'text', text: 'Inserted 1 row' }] };
      }

      const createMatch = sql.match(/CREATE\s+TABLE\s+(\w+)\s*\((.+?)\)/i);
      if (createMatch) {
        const cols = createMatch[2].split(',').map(c => c.trim().split(/\s+/)[0]);
        return this._handleCreateTable({ name: createMatch[1], columns: cols });
      }

      return { content: [{ type: 'text', text: `Unsupported SQL statement. Try: SELECT, INSERT, CREATE TABLE` }] };
    });
  }

  _handleQuery(args) {
    return this.addTool('_query_helper', '', {}, async () => {}).handler(args);
  }

  _handleCreateTable(args) {
    return this.addTool('_create_helper', '', {}, async () => {}).handler(args);
  }

  _registerResources() {
    this.addResource('database://schema', 'Database Schema', 'Full database schema with all tables', () => ({
      contents: [{
        uri: 'database://schema',
        text: JSON.stringify(Array.from(this.tables.entries()).map(([name, t]) => ({
          name,
          columns: t.columns,
          rowCount: t.rows.length,
        })), null, 2),
      }],
    }));

    this.addResource('database://stats', 'Database Statistics', 'Database usage statistics', () => ({
      contents: [{
        uri: 'database://stats',
        text: JSON.stringify({
          tableCount: this.tables.size,
          totalRows: Array.from(this.tables.values()).reduce((sum, t) => sum + t.rows.length, 0),
        }, null, 2),
      }],
    }));
  }
}
