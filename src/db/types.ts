export type SqlValue = string | number | null;

/**
 * The minimal database surface the app relies on. Implemented by the Tauri SQL plugin
 * (desktop) and by sql.js (browser preview and tests), both real SQLite.
 * Placeholders are positional `?`.
 */
export interface Db {
  readonly kind: 'tauri' | 'sqljs';
  /** Where the data lives, for display in the settings. */
  readonly location: string;
  execute(sql: string, params?: SqlValue[]): Promise<{ rowsAffected: number }>;
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Runs a multi-statement script in one call (used for migrations wrapped in BEGIN/COMMIT). */
  executeScript(sql: string): Promise<void>;
}
