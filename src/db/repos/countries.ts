import type { Country } from '../../domain/countries';
import type { ContinentId } from '../../geo/continents';
import type { Db, SqlValue } from '../types';

interface CountryRow {
  id: string;
  name: string;
  iso_code: string | null;
  continent: ContinentId;
  visited: number;
  visited_year: number | null;
}

const toCountry = (r: CountryRow): Country => ({
  id: r.id,
  name: r.name,
  isoCode: r.iso_code,
  continent: r.continent,
  visited: r.visited === 1,
  visitedYear: r.visited_year,
});

export interface CountrySeed {
  id: string;
  name: string;
  iso: string | null;
  continent: ContinentId;
}

/**
 * Inserts all countries, or refreshes name, ISO code and continent of existing rows.
 * The user's own data (visited, year) is never touched. One statement, so it is atomic.
 */
export async function seedCountries(db: Db, seeds: readonly CountrySeed[]): Promise<void> {
  if (seeds.length === 0) return;
  const values = seeds.map(() => '(?, ?, ?, ?)').join(', ');
  const params: SqlValue[] = seeds.flatMap((s) => [s.id, s.name, s.iso, s.continent]);
  await db.execute(
    `INSERT INTO countries (id, name, iso_code, continent) VALUES ${values}
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, iso_code = excluded.iso_code, continent = excluded.continent`,
    params,
  );
}

export async function listCountries(db: Db): Promise<Country[]> {
  const rows = await db.select<CountryRow>(
    'SELECT id, name, iso_code, continent, visited, visited_year FROM countries ORDER BY name',
  );
  return rows.map(toCountry);
}

export async function getCountry(db: Db, id: string): Promise<Country | undefined> {
  const rows = await db.select<CountryRow>(
    'SELECT id, name, iso_code, continent, visited, visited_year FROM countries WHERE id = ?',
    [id],
  );
  return rows[0] && toCountry(rows[0]);
}

export async function setVisited(db: Db, id: string, visited: boolean, year: number | null = null): Promise<void> {
  await db.execute('UPDATE countries SET visited = ?, visited_year = ? WHERE id = ?', [
    visited ? 1 : 0,
    visited ? year : null,
    id,
  ]);
}
