import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/testing';
import { getCountry, listCountries, seedCountries, setVisited } from '../db/repos/countries';
import { ATLAS, atlasCountry, continentBox } from '../geo/atlas';
import { CONTINENT_IDS } from '../geo/continents';
import { countriesByContinent, foldForSearch, searchCountries, visitedByContinent, type Country } from './countries';

const sample: Country[] = [
  { id: 'AUT', name: 'Österreich', isoCode: 'AT', continent: 'europe', visited: true, visitedYear: 2019 },
  { id: 'DEU', name: 'Deutschland', isoCode: 'DE', continent: 'europe', visited: true, visitedYear: null },
  { id: 'ALB', name: 'Albanien', isoCode: 'AL', continent: 'europe', visited: false, visitedYear: null },
  { id: 'JPN', name: 'Japan', isoCode: 'JP', continent: 'asia', visited: false, visitedYear: null },
  { id: 'USA', name: 'Vereinigte Staaten', isoCode: 'US', continent: 'north-america', visited: true, visitedYear: 2023 },
  { id: 'ARE', name: 'Vereinigte Arabische Emirate', isoCode: 'AE', continent: 'asia', visited: false, visitedYear: null },
];

describe('atlas', () => {
  it('contains every country once, with a continent and ISO code where one exists', () => {
    const ids = ATLAS.countries.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(230);
    expect(ATLAS.countries.every((c) => CONTINENT_IDS.includes(c.continent))).toBe(true);
    expect(atlasCountry('JPN')).toMatchObject({ name: 'Japan', iso: 'JP', continent: 'asia' });
    // Small states the 1:110m data would miss.
    for (const id of ['LUX', 'MLT', 'SGP', 'VAT', 'MCO', 'LIE']) expect(atlasCountry(id)?.tiny).toBe(true);
  });

  it('frames each continent around its own countries', () => {
    const inside = (id: string, box: readonly number[]) => {
      const [x, y] = atlasCountry(id)!.label;
      return x >= box[0]! && x <= box[2]! && y >= box[1]! && y <= box[3]!;
    };
    expect(inside('FRA', continentBox('europe'))).toBe(true);
    expect(inside('JPN', continentBox('asia'))).toBe(true);
    expect(inside('KEN', continentBox('africa'))).toBe(true);
    expect(inside('BRA', continentBox('south-america'))).toBe(true);
    expect(inside('BRA', continentBox('europe'))).toBe(false);
  });
});

describe('countries per continent', () => {
  it('groups and sorts alphabetically in German, with every continent present', () => {
    const groups = countriesByContinent(sample);
    expect(groups.europe.map((c) => c.name)).toEqual(['Albanien', 'Deutschland', 'Österreich']);
    expect(groups.asia.map((c) => c.id)).toEqual(['JPN', 'ARE']);
    expect(groups.antarctica).toEqual([]);
  });

  it('counts visited countries per continent', () => {
    const counts = visitedByContinent(sample);
    expect(counts.europe).toEqual({ visited: 2, total: 3 });
    expect(counts.asia).toEqual({ visited: 0, total: 2 });
    expect(counts['north-america']).toEqual({ visited: 1, total: 1 });
    expect(counts.oceania).toEqual({ visited: 0, total: 0 });
  });
});

describe('country search', () => {
  it('folds case, accents and umlaut spellings', () => {
    expect(foldForSearch('Österreich')).toBe(foldForSearch('oesterreich'));
    expect(foldForSearch('Österreich')).toBe(foldForSearch('OSTERREICH'));
    expect(foldForSearch('São Tomé')).toBe('sao tome');
  });

  it('ranks prefix matches before word and substring matches', () => {
    expect(searchCountries(sample, 'ver').map((c) => c.id)).toEqual(['ARE', 'USA']);
    expect(searchCountries(sample, 'arab').map((c) => c.id)).toEqual(['ARE']);
    expect(searchCountries(sample, 'reich').map((c) => c.id)).toEqual(['AUT']);
    expect(searchCountries(sample, 'oesterr').map((c) => c.id)).toEqual(['AUT']);
  });

  it('finds aliases and ignores empty queries', () => {
    expect(searchCountries(sample, 'usa').map((c) => c.id)).toEqual(['USA']);
    expect(searchCountries(sample, 'dubai').map((c) => c.id)).toEqual(['ARE']);
    expect(searchCountries(sample, '   ')).toEqual([]);
    expect(searchCountries(sample, 'xyz')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(searchCountries(sample, 'a', 2)).toHaveLength(2);
  });
});

describe('countries in SQLite', () => {
  it('seeds every atlas country as not visited', async () => {
    const db = await createTestDb({ seeded: true });
    const countries = await listCountries(db);
    expect(countries).toHaveLength(ATLAS.countries.length);
    expect(countries.every((c) => !c.visited)).toBe(true);
  });

  it('keeps visits when seeding again', async () => {
    const db = await createTestDb({ seeded: true });
    await setVisited(db, 'JPN', true, 2024);
    await seedCountries(db, ATLAS.countries);
    expect(await getCountry(db, 'JPN')).toMatchObject({ visited: true, visitedYear: 2024, name: 'Japan' });
    await setVisited(db, 'JPN', false, 2024);
    expect(await getCountry(db, 'JPN')).toMatchObject({ visited: false, visitedYear: null });
  });

  it('counts visited countries from the database', async () => {
    const db = await createTestDb({ seeded: true });
    await setVisited(db, 'DEU', true);
    await setVisited(db, 'FRA', true, 2018);
    await setVisited(db, 'JPN', true);
    const counts = visitedByContinent(await listCountries(db));
    expect(counts.europe.visited).toBe(2);
    expect(counts.asia.visited).toBe(1);
    expect(counts.europe.total).toBe(ATLAS.countries.filter((c) => c.continent === 'europe').length);
  });
});
