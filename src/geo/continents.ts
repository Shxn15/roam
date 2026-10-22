export const CONTINENTS = [
  { id: 'africa', name: 'Afrika' },
  { id: 'asia', name: 'Asien' },
  { id: 'europe', name: 'Europa' },
  { id: 'north-america', name: 'Nordamerika' },
  { id: 'south-america', name: 'Südamerika' },
  { id: 'oceania', name: 'Ozeanien' },
  { id: 'antarctica', name: 'Antarktis' },
] as const;

export type ContinentId = (typeof CONTINENTS)[number]['id'];

export const CONTINENT_IDS: readonly ContinentId[] = CONTINENTS.map((c) => c.id);

export function isContinentId(value: unknown): value is ContinentId {
  return CONTINENT_IDS.includes(value as ContinentId);
}

export function continentName(id: ContinentId): string {
  return CONTINENTS.find((c) => c.id === id)!.name;
}

/** [west, south, east, north] in degrees. */
export type LonLatBox = readonly [number, number, number, number];

/**
 * The part of the world the camera frames for each continent. Hand-tuned instead of
 * computed, so far-flung territories (French Guiana, Hawaii, Pacific islands across
 * the date line) do not stretch the view.
 */
export const CONTINENT_VIEWS: Record<ContinentId, LonLatBox> = {
  africa: [-19, -36, 53, 38],
  asia: [26, -11, 148, 58],
  europe: [-25, 34, 45, 71],
  'north-america': [-168, 6, -12, 78],
  'south-america': [-92, -56, -32, 13],
  oceania: [110, -48, 180, 2],
  antarctica: [-180, -90, 180, -60],
};

/** The world view leaves out most of Antarctica, which would otherwise eat a third of the screen. */
export const WORLD_VIEW: LonLatBox = [-180, -58, 180, 84];
