import type { Db } from './types';

let current: Db | null = null;

/** The app-wide database, set once during startup. */
export function setDb(db: Db): void {
  current = db;
}

export function getDb(): Db {
  if (!current) throw new Error('Datenbank ist noch nicht geöffnet');
  return current;
}
