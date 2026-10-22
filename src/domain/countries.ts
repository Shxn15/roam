import { CONTINENT_IDS, type ContinentId } from '../geo/continents';

export interface Country {
  id: string;
  name: string;
  isoCode: string | null;
  continent: ContinentId;
  visited: boolean;
  visitedYear: number | null;
}

const collator = new Intl.Collator('de', { sensitivity: 'base' });

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

/** Countries per continent, alphabetical in German. Every continent is present, maybe empty. */
export function countriesByContinent(countries: readonly Country[]): Record<ContinentId, Country[]> {
  const groups = Object.fromEntries(CONTINENT_IDS.map((id) => [id, [] as Country[]])) as Record<ContinentId, Country[]>;
  for (const c of countries) groups[c.continent].push(c);
  for (const id of CONTINENT_IDS) groups[id] = sortByName(groups[id]);
  return groups;
}

export interface ContinentProgress {
  visited: number;
  total: number;
}

export function visitedByContinent(countries: readonly Country[]): Record<ContinentId, ContinentProgress> {
  const result = Object.fromEntries(CONTINENT_IDS.map((id) => [id, { visited: 0, total: 0 }])) as Record<
    ContinentId,
    ContinentProgress
  >;
  for (const c of countries) {
    result[c.continent].total += 1;
    if (c.visited) result[c.continent].visited += 1;
  }
  return result;
}

/** Other names people search for. Keys are country ids. */
export const SEARCH_ALIASES: Record<string, readonly string[]> = {
  USA: ['USA', 'Amerika', 'United States'],
  GBR: ['Großbritannien', 'England', 'Schottland', 'Wales', 'UK'],
  NLD: ['Holland'],
  CZE: ['Tschechische Republik'],
  ARE: ['Dubai', 'VAE'],
  KOR: ['Korea'],
  CIV: ["Côte d'Ivoire"],
  MMR: ['Burma', 'Birma'],
  SWZ: ['Swasiland'],
  TLS: ['Timor-Leste'],
};

/**
 * Folds case, accents and German umlaut spellings, so "osterreich", "oesterreich"
 * and "Österreich" all match.
 */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Filters countries by name (and aliases): prefix matches first, then word starts, then anywhere. */
export function searchCountries<T extends { id: string; name: string }>(countries: readonly T[], query: string, limit = 8): T[] {
  const q = foldForSearch(query);
  if (!q) return [];
  const scored: { item: T; score: number }[] = [];
  for (const item of countries) {
    const names = [item.name, ...(SEARCH_ALIASES[item.id] ?? [])].map(foldForSearch);
    let score = Infinity;
    names.forEach((name, i) => {
      const alias = i > 0 ? 3 : 0;
      if (name.startsWith(q)) score = Math.min(score, 0 + alias);
      else if (name.split(' ').some((word) => word.startsWith(q))) score = Math.min(score, 1 + alias);
      else if (name.includes(q)) score = Math.min(score, 2 + alias);
    });
    if (score < Infinity) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || collator.compare(a.item.name, b.item.name))
    .slice(0, limit)
    .map((s) => s.item);
}
