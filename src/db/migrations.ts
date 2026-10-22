import type { Db } from './types';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Schema history. Append only: never edit a migration that has shipped.
 * Each milestone adds its tables in a new migration.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'Einstellungen und Themes',
    sql: `
      CREATE TABLE settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL CHECK (json_valid(value)),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE themes (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        data       TEXT NOT NULL CHECK (json_valid(data)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];

export async function schemaVersion(db: Db): Promise<number> {
  const rows = await db.select<{ user_version: number }>('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/** Brings the schema up to date. Each migration runs atomically and bumps `PRAGMA user_version`. */
export async function migrate(db: Db, migrations: readonly Migration[] = MIGRATIONS): Promise<{ from: number; to: number }> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  sorted.forEach((m, i) => {
    if (m.version !== i + 1) throw new Error(`Migrationen müssen lückenlos ab 1 nummeriert sein (gefunden: ${m.version})`);
  });

  const from = await schemaVersion(db);
  if (from > sorted.length) {
    throw new Error(`Die Datenbank stammt aus einer neueren Roam-Version (Schema ${from}).`);
  }

  for (const m of sorted.slice(from)) {
    try {
      await db.executeScript(`BEGIN;\n${m.sql}\nPRAGMA user_version = ${m.version};\nCOMMIT;`);
    } catch (error) {
      await db.executeScript('ROLLBACK;').catch(() => undefined);
      throw new Error(`Migration ${m.version} („${m.name}“) fehlgeschlagen: ${String(error)}`);
    }
  }
  return { from, to: await schemaVersion(db) };
}
