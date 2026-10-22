// Builds src/geo/data/atlas.json from Natural Earth 1:50m admin-0 countries (public domain).
// The countries are simplified and projected once (Natural Earth projection) so the app
// never re-projects at runtime: the map only moves a transform.
//
//   npm run atlas            (downloads the source once into node_modules/.cache)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const CACHE = join(ROOT, 'node_modules/.cache/roam/ne_50m_admin_0_countries.geojson');
const OUT = join(ROOT, 'src/geo/data/atlas.json');

/** Width of the reference space all paths are projected into. */
const WIDTH = 1000;
/** Share of vertices kept after simplification (by importance). */
const KEEP = 0.45;

// Not countries in any travel sense.
const EXCLUDE = new Set(['KAS', 'ATC']);

// Shorter names as people say them.
const NAMES = {
  CHN: 'China',
  TWN: 'Taiwan',
  CYP: 'Zypern',
  CYN: 'Nordzypern',
  MDA: 'Moldau',
  ATA: 'Antarktis',
  PSX: 'Palästinensische Gebiete',
};

const CONTINENTS = {
  Africa: 'africa',
  Antarctica: 'antarctica',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'north-america',
  Oceania: 'oceania',
  'South America': 'south-america',
};
// Natural Earth puts small ocean islands on a "Seven seas" continent; use their UN region instead.
const REGION_TO_CONTINENT = { Africa: 'africa', Asia: 'asia', Americas: 'south-america', Oceania: 'oceania' };
const CONTINENT_OVERRIDES = { HMD: 'oceania' };

async function loadSource() {
  if (!existsSync(CACHE)) {
    console.log(`Lade ${SOURCE}`);
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, await res.text());
  }
  return JSON.parse(readFileSync(CACHE, 'utf8'));
}

function continentOf(p) {
  return CONTINENT_OVERRIDES[p.ADM0_A3] ?? CONTINENTS[p.CONTINENT] ?? REGION_TO_CONTINENT[p.REGION_UN];
}

/** d3-geo expects clockwise outer rings; flip a feature that would otherwise cover the globe. */
function rewind(f) {
  if (geoArea(f) <= 2 * Math.PI) return f;
  const flip = (rings) => rings.map((ring) => [...ring].reverse());
  const g = f.geometry;
  const coordinates = g.type === 'Polygon' ? flip(g.coordinates) : g.coordinates.map(flip);
  return { ...f, geometry: { ...g, coordinates } };
}

const r2 = (n) => Math.round(n * 100) / 100;

const source = await loadSource();
const features = source.features
  .filter((f) => !EXCLUDE.has(f.properties.ADM0_A3))
  .map((f) => {
    const p = f.properties;
    const continent = continentOf(p);
    if (!continent) throw new Error(`Kein Kontinent für ${p.ADM0_A3}`);
    return rewind({
      type: 'Feature',
      id: p.ADM0_A3,
      properties: {
        name: NAMES[p.ADM0_A3] ?? p.NAME_DE ?? p.NAME,
        iso: p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : null,
        continent,
        label: [p.LABEL_X, p.LABEL_Y],
      },
      geometry: f.geometry,
    });
  });

let topo = topology({ countries: { type: 'FeatureCollection', features } }, 1e6);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 1 - KEEP));
const simplified = feature(topo, topo.objects.countries).features;

const projection = geoNaturalEarth1().fitWidth(WIDTH, { type: 'Sphere' });
const path = geoPath(projection).digits(2);
const [[, top], [, bottom]] = path.bounds({ type: 'Sphere' });

const countries = simplified
  .map((f) => {
    // The largest part decides where a country "is" (France without its overseas departments).
    const parts =
      f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
        : [f.geometry];
    const main = parts.reduce((best, part) => (path.area(part) > path.area(best) ? part : best));
    const [[x0, y0], [x1, y1]] = path.bounds(main);
    const [lx, ly] = projection(f.properties.label);
    return {
      id: f.id,
      iso: f.properties.iso,
      name: f.properties.name,
      continent: f.properties.continent,
      d: path(f),
      box: [r2(x0), r2(y0), r2(x1), r2(y1)],
      label: [r2(lx), r2(ly)],
      tiny: Math.max(x1 - x0, y1 - y0) < 3,
    };
  })
  .filter((c) => c.d)
  .sort((a, b) => a.id.localeCompare(b.id));

const atlas = {
  source: 'Natural Earth 1:50m Admin 0 – Countries, v5.1.2 (public domain)',
  width: WIDTH,
  height: r2(bottom - top),
  projection: { scale: projection.scale(), translate: projection.translate() },
  countries,
};

writeFileSync(OUT, JSON.stringify(atlas));
const kb = Math.round(Buffer.byteLength(JSON.stringify(atlas)) / 1024);
console.log(`${countries.length} Länder → ${OUT} (${kb} KB)`);
