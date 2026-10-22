import { isTauri } from '@tauri-apps/api/core';
import { migrate } from './migrations';
import type { Db } from './types';

export type { Db, SqlValue } from './types';

/** Opens the right SQLite backend for the current runtime and migrates it. */
export async function openDatabase(): Promise<Db> {
  const db = isTauri()
    ? await (await import('./tauriDb')).openTauriDb()
    : await (await import('./browserDb')).openBrowserDb();
  await migrate(db);
  return db;
}
