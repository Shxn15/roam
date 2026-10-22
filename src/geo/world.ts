import { geoGraticule, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

// Milestone 1 only needs the silhouette of the land. Milestone 2 replaces this with
// Natural Earth countries (names, ISO codes, continents) for the interactive map.
const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

/** The inhabited world; Antarctica may run off the bottom edge. */
const FIT_OUTLINE = geoGraticule()
  .extent([
    [-180, -56],
    [180, 84],
  ])
  .outline();

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WorldPaths {
  sphere: string;
  graticule: string;
  land: string;
}

/** SVG path data for a Natural Earth projection of the world fitted into a box. */
export function worldPaths(width: number, height: number, insets: Insets): WorldPaths {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [insets.left, insets.top],
      [Math.max(insets.left + 1, width - insets.right), Math.max(insets.top + 1, height - insets.bottom)],
    ],
    FIT_OUTLINE,
  );
  const path = geoPath(projection);
  return {
    sphere: path({ type: 'Sphere' }) ?? '',
    graticule: path(geoGraticule10()) ?? '',
    land: path(land) ?? '',
  };
}
