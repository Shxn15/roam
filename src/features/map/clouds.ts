import { clamp01, easeOutCubic, lerp } from './camera';

export interface Puff {
  cx: number;
  cy: number;
  r: number;
}

/** One cloud. Positions are fractions of the viewport; sizes fractions of its longer side. */
export interface Cloud {
  /** Where the cloud rests at full cover. */
  rest: [number, number];
  /** Unit direction it comes from and leaves to (off-screen, outward from the center). */
  dir: [number, number];
  size: number;
  /** Cover range during which this cloud travels: a lag makes clouds move at different speeds. */
  enter: [number, number];
  puffs: Puff[];
  /** Gentle sway while resting, in px. */
  sway: number;
  phase: number;
}

/** Deterministic pseudo random numbers, so clouds look the same every time. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cloud shapes live in a 200×120 box: a flat base and rounded tops. */
function makePuffs(rand: () => number): Puff[] {
  const puffs: Puff[] = [];
  const count = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const x = 34 + (132 * i) / (count - 1) + (rand() - 0.5) * 14;
    const middle = 1 - Math.abs(i / (count - 1) - 0.5) * 2;
    const r = 22 + middle * 22 + rand() * 10;
    puffs.push({ cx: x, cy: 84 - r * 0.55 + rand() * 6, r });
  }
  puffs.push({ cx: 100, cy: 86, r: 34 }, { cx: 60, cy: 90, r: 24 }, { cx: 140, cy: 90, r: 24 });
  return puffs;
}

/** Spreads `count` clouds over the screen on a jittered grid so that together they cover it. */
export function makeClouds(count: number, seed = 11): Cloud[] {
  const rand = random(seed);
  const cols = Math.max(2, Math.ceil(Math.sqrt(count * 1.5)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rest: [number, number] = [
      (col + 0.5) / cols + (rand() - 0.5) * (0.5 / cols),
      (row + 0.5) / rows + (rand() - 0.5) * (0.5 / rows),
    ];
    const angle = Math.atan2(rest[1] - 0.5, rest[0] - 0.5) + (rand() - 0.5) * 0.6;
    const lag = rand() * 0.3;
    clouds.push({
      rest,
      dir: [Math.cos(angle), Math.sin(angle)],
      size: 0.4 + rand() * 0.24,
      enter: [lag, Math.min(1, lag + 0.55 + rand() * 0.25)],
      puffs: makePuffs(rand),
      sway: 6 + rand() * 10,
      phase: rand() * Math.PI * 2,
    });
  }
  return clouds;
}

export interface CloudPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a cloud is for a given overall cover (0 = gone, 1 = screen covered). In and out use
 * the same path, so an interrupted transition never makes a cloud jump.
 */
export function placeCloud(cloud: Cloud, cover: number, width: number, height: number, timeMs: number): CloudPlacement {
  const span = Math.max(width, height);
  const w = cloud.size * span;
  const h = w * 0.6;
  const local = easeOutCubic(clamp01((cover - cloud.enter[0]) / (cloud.enter[1] - cloud.enter[0])));
  const away = span * 0.75 + w;
  const restX = cloud.rest[0] * width;
  const restY = cloud.rest[1] * height;
  const sway = Math.sin(timeMs / 900 + cloud.phase) * cloud.sway * local;
  return {
    x: lerp(restX + cloud.dir[0] * away, restX, local) - w / 2 + sway,
    y: lerp(restY + cloud.dir[1] * away, restY, local) - h / 2,
    width: w,
    height: h,
  };
}
