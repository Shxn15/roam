import { clamp01, easeInOutCubic, easeInOutSine, easeOutCubic, interpolateCamera, smoothstep, type Camera, type Point, type Viewport } from './camera';
import type { Route } from './route';

type Span = readonly [number, number];

/** The phases of a flight with clouds, in ms from its start. */
export interface TransitionTiming {
  durationMs: number;
  cloudCount: number;
  cloudsIn: Span;
  zoom: Span;
  cloudsOut: Span;
  /** The plane flies during phases 1–2 and shows up again at the destination in phase 3. */
  flight: Span;
  /** The plane disappears into the closing clouds … */
  planeIntoClouds: Span;
  /** … comes back at the destination … */
  planeAtDestination: Span;
  /** … and fades out, together with the dashed line. */
  planeOut: Span;
  trailOut: Span;
  /** A ring that pops up at the destination after landing (country flights). */
  pop?: Span;
  /** With reduced motion: a short fade out and in, no clouds, no plane. */
  fadeMs: number;
  /** Plain camera moves (back to the world, focus on a country). */
  glideMs: number;
}

/**
 * The continent transition in one place, so it is easy to tune. Times in ms.
 * Phase 1 clouds roll in, phase 2 the camera zooms under them, phase 3 they drift away.
 * The countries appear in the panel once the zoom is over (end of `zoom`).
 */
export const CONTINENT_TRANSITION = {
  durationMs: 1800,
  cloudCount: 10,
  cloudsIn: [0, 500],
  zoom: [400, 1400],
  cloudsOut: [1200, 1800],
  flight: [0, 1400],
  planeIntoClouds: [380, 560],
  planeAtDestination: [1330, 1480],
  planeOut: [1600, 1800],
  trailOut: [1450, 1800],
  fadeMs: 360,
  glideMs: 900,
} as const satisfies TransitionTiming;

/**
 * Flying from the continent to a country: the same layers and phases, a little quicker, then
 * a ring pops up in the country's accent color and the country page opens (about 2 s).
 */
export const COUNTRY_TRANSITION = {
  durationMs: 2000,
  cloudCount: CONTINENT_TRANSITION.cloudCount,
  cloudsIn: [0, 450],
  zoom: [350, 1250],
  cloudsOut: [1050, 1500],
  flight: [0, 1250],
  planeIntoClouds: [330, 480],
  planeAtDestination: [1150, 1300],
  planeOut: [1380, 1560],
  trailOut: [1250, 1560],
  pop: [1400, 2000],
  fadeMs: 300,
  glideMs: CONTINENT_TRANSITION.glideMs,
} as const satisfies TransitionTiming;

export type TransitionKind = 'clouds' | 'fade' | 'glide';

export interface Transition {
  kind: TransitionKind;
  timing: TransitionTiming;
  startedAt: number;
  duration: number;
  from: Camera;
  to: Camera;
  /** Cloud cover when this transition started (an interrupted one leaves clouds behind). */
  startCover: number;
  route: Route | null;
  /** Where the ring pops up (map coordinates), if this flight has one. */
  popAt: Point | null;
  /** The country this flight lands in (country flights only). */
  arrival: string | null;
  camera: (t: number) => Camera;
}

export interface TransitionFrame {
  camera: Camera;
  /** 0 = no clouds, 1 = screen covered. */
  cover: number;
  /** 0..1 along the route. */
  flight: number;
  planeOpacity: number;
  trailOpacity: number;
  /** For the reduced-motion fade. */
  mapOpacity: number;
  /** 0..1 through the arrival ring, null when there is none. */
  pop: number | null;
  /**
   * The map is hidden (clouds closed, or mid-fade): the moment to switch which continent is
   * emphasized without anyone seeing a jump, so no fade has to run on the map's elements.
   */
  covered: boolean;
  /** The camera arrived: the continent's countries may appear in the panel. */
  revealed: boolean;
  done: boolean;
}

export function createTransition(options: {
  kind: TransitionKind;
  now: number;
  from: Camera;
  to: Camera;
  viewport: Viewport;
  timing?: TransitionTiming;
  startCover?: number;
  route?: Route | null;
  popAt?: Point | null;
  arrival?: string | null;
  duration?: number;
}): Transition {
  const T: TransitionTiming = options.timing ?? CONTINENT_TRANSITION;
  const clouds = options.kind === 'clouds';
  const duration = options.duration ?? (clouds ? T.durationMs : options.kind === 'fade' ? T.fadeMs : T.glideMs);
  return {
    kind: options.kind,
    timing: T,
    startedAt: options.now,
    duration,
    from: options.from,
    to: options.to,
    startCover: options.startCover ?? 0,
    route: clouds ? (options.route ?? null) : null,
    popAt: clouds && T.pop ? (options.popAt ?? null) : null,
    arrival: options.arrival ?? null,
    camera: interpolateCamera(options.from, options.to, options.viewport),
  };
}

const progress = (t: number, [a, b]: Span) => clamp01((t - a) / (b - a));

export function sampleTransition(tr: Transition, now: number): TransitionFrame {
  const t = Math.max(0, now - tr.startedAt);
  const done = t >= tr.duration;
  // Clouds left over from an interrupted transition clear away quickly.
  const leftover = tr.startCover * (1 - easeOutCubic(clamp01(t / 400)));

  if (tr.kind === 'fade') {
    const half = tr.duration / 2;
    return {
      camera: t < half ? tr.from : tr.to,
      cover: leftover,
      flight: 0,
      planeOpacity: 0,
      trailOpacity: 0,
      mapOpacity: done ? 1 : t < half ? 1 - t / half : (t - half) / half,
      pop: null,
      covered: t >= half,
      revealed: done,
      done,
    };
  }

  if (tr.kind === 'glide') {
    return {
      camera: tr.camera(easeInOutCubic(clamp01(t / tr.duration))),
      cover: leftover,
      flight: 0,
      planeOpacity: 0,
      trailOpacity: 0,
      mapOpacity: 1,
      pop: null,
      covered: true,
      revealed: done,
      done,
    };
  }

  const T = tr.timing;
  let cover: number;
  if (t < T.cloudsIn[1]) cover = tr.startCover + (1 - tr.startCover) * easeInOutSine(progress(t, T.cloudsIn));
  else if (t < T.cloudsOut[0]) cover = 1;
  else cover = 1 - easeInOutCubic(progress(t, T.cloudsOut));

  // The plane flies into the closing clouds, then shows up again at the destination.
  const intoClouds = 1 - smoothstep(T.planeIntoClouds[0], T.planeIntoClouds[1], t);
  const atDestination = smoothstep(T.planeAtDestination[0], T.planeAtDestination[1], t);
  return {
    camera: tr.camera(easeInOutCubic(progress(t, T.zoom))),
    cover: done ? 0 : cover,
    flight: easeInOutSine(progress(t, T.flight)),
    planeOpacity: done ? 0 : clamp01(t / 150) * Math.max(intoClouds, atDestination) * (1 - smoothstep(T.planeOut[0], T.planeOut[1], t)),
    trailOpacity: done ? 0 : 1 - smoothstep(T.trailOut[0], T.trailOut[1], t),
    mapOpacity: 1,
    pop: tr.popAt && T.pop && !done && t >= T.pop[0] ? progress(t, T.pop) : null,
    covered: cover >= 0.999 || t >= T.cloudsIn[1],
    revealed: t >= T.zoom[1],
    done,
  };
}
