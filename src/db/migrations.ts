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
  {
    version: 2,
    name: 'Länder und Reisen',
    sql: `
      CREATE TABLE countries (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        iso_code     TEXT,
        continent    TEXT NOT NULL CHECK (continent IN
                       ('africa', 'antarctica', 'asia', 'europe', 'north-america', 'oceania', 'south-america')),
        visited      INTEGER NOT NULL DEFAULT 0 CHECK (visited IN (0, 1)),
        visited_year INTEGER CHECK (visited_year IS NULL OR visited_year BETWEEN 1900 AND 2200)
      );
      CREATE INDEX countries_by_continent ON countries (continent);
      CREATE TABLE trips (
        id         TEXT PRIMARY KEY,
        country_id TEXT NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
        title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
        status     TEXT NOT NULL CHECK (status IN ('idea', 'planned', 'traveling', 'done')),
        days       INTEGER NOT NULL CHECK (days BETWEEN 1 AND 365),
        start_date TEXT CHECK (start_date IS NULL OR date(start_date) IS start_date),
        created_at TEXT NOT NULL
      );
      CREATE INDEX trips_by_country ON trips (country_id);
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
