import initSqlJs from 'sql.js';
import { ATLAS } from '../geo/atlas';
import { migrate } from './migrations';
import { seedCountries } from './repos/countries';
import { wrapSqlJs } from './sqljsDb';
import type { Db } from './types';

/**
 * Fresh in-memory SQLite for tests. `migrated: false` leaves it empty (to test the migration
 * runner), `seeded: true` also inserts all countries from the atlas.
 */
export async function createTestDb({ migrated = true, seeded = false } = {}): Promise<Db> {
  const SQL = await initSqlJs();
  const db = wrapSqlJs(SQL, { location: ':memory:' });
  if (migrated) await migrate(db);
  if (seeded) await seedCountries(db, ATLAS.countries);
  return db;
}
