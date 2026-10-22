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
  {
    version: 3,
    name: 'Tage und Zeitblöcke',
    sql: `
      CREATE TABLE days (
        id         TEXT PRIMARY KEY,
        trip_id    TEXT NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 365),
        date       TEXT CHECK (date IS NULL OR date(date) IS date),
        UNIQUE (trip_id, day_number)
      );
      CREATE TABLE time_blocks (
        id         TEXT PRIMARY KEY,
        day_id     TEXT NOT NULL REFERENCES days (id) ON DELETE CASCADE,
        start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND start_time < '24:00'),
        end_time   TEXT CHECK (end_time IS NULL OR
                     (end_time GLOB '[0-2][0-9]:[0-5][0-9]' AND end_time <= '24:00' AND end_time > start_time)),
        title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
        location   TEXT NOT NULL DEFAULT '',
        note       TEXT NOT NULL DEFAULT '',
        category   TEXT NOT NULL CHECK (category IN ('activity', 'food', 'transport', 'stay')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX time_blocks_by_day ON time_blocks (day_id, start_time);
      -- Trips from before this version get their days: 1 to N, dated if the trip has a start.
      WITH RECURSIVE n (trip_id, k, total, start_date) AS (
        SELECT id, 1, days, start_date FROM trips
        UNION ALL
        SELECT trip_id, k + 1, total, start_date FROM n WHERE k < total
      )
      INSERT INTO days (id, trip_id, day_number, date)
      SELECT lower(hex(randomblob(16))), trip_id, k,
             CASE WHEN start_date IS NULL THEN NULL ELSE date(start_date, '+' || (k - 1) || ' days') END
      FROM n;
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
