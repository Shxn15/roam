import { geoGraticule, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import atlasJson from './data/atlas.json';
import { CONTINENT_VIEWS, WORLD_VIEW, type ContinentId, type LonLatBox } from './continents';

/** [x0, y0, x1, y1] in the atlas' projected reference space. */
export type Box = readonly [number, number, number, number];

export interface AtlasCountry {
  /** Natural Earth ADM0_A3, e.g. "JPN". Also the primary key in the countries table. */
  id: string;
  iso: string | null;
  name: string;
  continent: ContinentId;
  /** SVG path, pre-projected (Natural Earth) into the reference space. Detailed. */
  d: string;
  /** The same outline, coarse: enough for wide views, much cheaper to draw. */
  dc: string;
  /** Bounds of the country's largest part. */
  box: Box;
  label: [number, number];
  /** Too small to see at world scale; drawn as a dot instead. */
  tiny: boolean;
}

interface AtlasFile {
  width: number;
  height: number;
  projection: { scale: number; translate: [number, number] };
  countries: AtlasCountry[];
}

/** Built by scripts/build-atlas.mjs from Natural Earth 1:50m. */
export const ATLAS = atlasJson as unknown as AtlasFile;

export const atlasProjection = geoNaturalEarth1()
  .scale(ATLAS.projection.scale)
  .translate(ATLAS.projection.translate);

const path = geoPath(atlasProjection).digits(1);

export const SPHERE_PATH = path({ type: 'Sphere' }) ?? '';
export const GRATICULE_PATH = path(geoGraticule10()) ?? '';

export function projectLonLatBox(box: LonLatBox): Box {
  const outline = geoGraticule()
    .extent([
      [box[0], box[1]],
      [box[2], box[3]],
    ])
    .outline();
  const [[x0, y0], [x1, y1]] = path.bounds(outline);
  return [x0, y0, x1, y1];
}

export const WORLD_BOX = projectLonLatBox(WORLD_VIEW);

const continentBoxes = new Map<ContinentId, Box>();

export function continentBox(id: ContinentId): Box {
  let box = continentBoxes.get(id);
  if (!box) {
    box = projectLonLatBox(CONTINENT_VIEWS[id]);
    continentBoxes.set(id, box);
  }
  return box;
}

export function boxCenter(box: Box): [number, number] {
  return [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
}

const byId = new Map(ATLAS.countries.map((c) => [c.id, c]));

export function atlasCountry(id: string): AtlasCountry | undefined {
  return byId.get(id);
}
