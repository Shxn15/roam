import type { Database, SqlJsStatic } from 'sql.js';
import type { Db, SqlValue } from './types';

export type SqlJsDb = Db & {
  /** Serializes the database (e.g. for the browser preview's IndexedDB copy). */
  exportBytes(): Uint8Array;
};

/** Wraps an in-memory sql.js database. Used in the browser preview and in tests. */
export function wrapSqlJs(
  SQL: SqlJsStatic,
  options: { location: string; data?: Uint8Array; onWrite?: () => void },
): SqlJsDb {
  const db: Database = new SQL.Database(options.data);
  const applyPragmas = () => db.run('PRAGMA foreign_keys = ON');
  applyPragmas();

  return {
    kind: 'sqljs',
    location: options.location,
    async execute(sql: string, params: SqlValue[] = []) {
      db.run(sql, params);
      const rowsAffected = db.getRowsModified();
      options.onWrite?.();
      return { rowsAffected };
    },
    async select<T>(sql: string, params: SqlValue[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async executeScript(sql: string) {
      db.exec(sql);
      options.onWrite?.();
    },
    exportBytes() {
      const bytes = db.export();
      // export() reopens the database, which resets connection pragmas.
      applyPragmas();
      return bytes;
    },
  };
}
