import Database from '@tauri-apps/plugin-sql';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { Db, SqlValue } from './types';

/** Desktop: SQLite file in the app data folder (next to the `images` folder). */
export async function openTauriDb(): Promise<Db> {
  const file = await join(await appDataDir(), 'roam.db');
  const sql = await Database.load(`sqlite:${file}`);
  return {
    kind: 'tauri',
    location: file,
    async execute(query: string, params: SqlValue[] = []) {
      const result = await sql.execute(query, params);
      return { rowsAffected: result.rowsAffected };
    },
    select: <T>(query: string, params: SqlValue[] = []) => sql.select<T[]>(query, params),
    async executeScript(script: string) {
      await sql.execute(script);
    },
  };
}
