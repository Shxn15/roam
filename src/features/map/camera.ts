import type { Box } from '../../geo/atlas';

/** Screen = map × k + (x, y). Map coordinates are the atlas' projected reference space. */
export interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The map's size on screen and the space floating panels take from it. */
export interface Viewport {
  width: number;
  height: number;
  insets: Insets;
}

export type Point = readonly [number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Center of the area not covered by panels. */
export function viewCenter(v: Viewport): [number, number] {
  return [
    v.insets.left + (v.width - v.insets.left - v.insets.right) / 2,
    v.insets.top + (v.height - v.insets.top - v.insets.bottom) / 2,
  ];
}

/** The camera that shows `box` as large as possible in the free area. */
export function fitBox(box: Box, v: Viewport, padding = 28): Camera {
  const w = Math.max(1, v.width - v.insets.left - v.insets.right - 2 * padding);
  const h = Math.max(1, v.height - v.insets.top - v.insets.bottom - 2 * padding);
  const bw = Math.max(1e-6, box[2] - box[0]);
  const bh = Math.max(1e-6, box[3] - box[1]);
  const k = Math.min(w / bw, h / bh);
  const [cx, cy] = viewCenter(v);
  return { k, x: cx - (box[0] + bw / 2) * k, y: cy - (box[1] + bh / 2) * k };
}

export const screenToMap = (c: Camera, [sx, sy]: Point): [number, number] => [(sx - c.x) / c.k, (sy - c.y) / c.k];
export const mapToScreen = (c: Camera, [mx, my]: Point): [number, number] => [mx * c.k + c.x, my * c.k + c.y];

export interface ZoomLimits {
  min: number;
  max: number;
}

/** Zooms by `factor` while the map point under `anchor` stays where it is. */
export function zoomAround(c: Camera, factor: number, anchor: Point, limits: ZoomLimits): Camera {
  const k = Math.min(limits.max, Math.max(limits.min, c.k * factor));
  const f = k / c.k;
  return { k, x: anchor[0] - (anchor[0] - c.x) * f, y: anchor[1] - (anchor[1] - c.y) * f };
}

/** Keeps at least `margin` pixels of `world` on screen, so the map can never be lost. */
export function clampCamera(c: Camera, v: Viewport, world: Box, limits: ZoomLimits, margin = 160): Camera {
  const k = Math.min(limits.max, Math.max(limits.min, c.k));
  const range = (lo: number, hi: number, size: number, value: number) => {
    // world spans [lo*k + value, hi*k + value]; keep its overlap with [0, size] ≥ margin
    const min = margin - hi * k;
    const max = size - margin - lo * k;
    return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value));
  };
  return { k, x: range(world[0], world[2], v.width, c.x), y: range(world[1], world[3], v.height, c.y) };
}

/**
 * Smooth camera path: the map point in the view center moves in a straight line while
 * the zoom changes geometrically, so zooming in and out feel equally fast.
 */
export function interpolateCamera(a: Camera, b: Camera, v: Viewport): (t: number) => Camera {
  const center = viewCenter(v);
  const [ax, ay] = screenToMap(a, center);
  const [bx, by] = screenToMap(b, center);
  const ratio = b.k / a.k;
  return (t) => {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const k = a.k * ratio ** t;
    return { k, x: center[0] - lerp(ax, bx, t) * k, y: center[1] - lerp(ay, by, t) * k };
  };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
