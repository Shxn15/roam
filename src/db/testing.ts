import initSqlJs from 'sql.js';
import { migrate } from './migrations';
import { wrapSqlJs } from './sqljsDb';
import type { Db } from './types';

/** Fresh in-memory SQLite for tests. Pass `migrated: false` to test the migration runner itself. */
export async function createTestDb({ migrated = true } = {}): Promise<Db> {
  const SQL = await initSqlJs();
  const db = wrapSqlJs(SQL, { location: ':memory:' });
  if (migrated) await migrate(db);
  return db;
}
