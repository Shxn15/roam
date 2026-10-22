import { isTauri } from '@tauri-apps/api/core';
import { ATLAS } from '../geo/atlas';
import { migrate } from './migrations';
import { seedCountries } from './repos/countries';
import type { Db } from './types';

export type { Db, SqlValue } from './types';

/** Opens the right SQLite backend for the current runtime, migrates it and seeds the countries. */
export async function openDatabase(): Promise<Db> {
  const db = isTauri()
    ? await (await import('./tauriDb')).openTauriDb()
    : await (await import('./browserDb')).openBrowserDb();
  await migrate(db);
  await seedCountries(db, ATLAS.countries);
  return db;
}
