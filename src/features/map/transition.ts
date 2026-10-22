import { clamp01, easeInOutCubic, easeInOutSine, easeOutCubic, interpolateCamera, smoothstep, type Camera, type Viewport } from './camera';
import type { Route } from './route';

/**
 * The continent transition in one place, so it is easy to tune. Times in ms.
 * Phase 1 clouds roll in, phase 2 the camera zooms under them, phase 3 they drift away.
 */
export const CONTINENT_TRANSITION = {
  durationMs: 1800,
  cloudCount: 10,
  cloudsIn: [0, 500],
  zoom: [400, 1400],
  cloudsOut: [1200, 1800],
  /** The plane flies during phases 1–2 and shows up again at the destination in phase 3. */
  flight: [0, 1400],
  /** With reduced motion: a short fade out and in, no clouds, no plane. */
  fadeMs: 360,
  /** Plain camera moves (back to the world, focus on a country). */
  glideMs: 900,
} as const;

export type TransitionKind = 'clouds' | 'fade' | 'glide';

export interface Transition {
  kind: TransitionKind;
  startedAt: number;
  duration: number;
  from: Camera;
  to: Camera;
  /** Cloud cover when this transition started (an interrupted one leaves clouds behind). */
  startCover: number;
  route: Route | null;
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
  /** Phase 3 reached: the continent's countries may appear. */
  revealed: boolean;
  done: boolean;
}

export function createTransition(options: {
  kind: TransitionKind;
  now: number;
  from: Camera;
  to: Camera;
  viewport: Viewport;
  startCover?: number;
  route?: Route | null;
  duration?: number;
}): Transition {
  const T = CONTINENT_TRANSITION;
  const duration =
    options.duration ?? (options.kind === 'clouds' ? T.durationMs : options.kind === 'fade' ? T.fadeMs : T.glideMs);
  return {
    kind: options.kind,
    startedAt: options.now,
    duration,
    from: options.from,
    to: options.to,
    startCover: options.startCover ?? 0,
    route: options.kind === 'clouds' ? (options.route ?? null) : null,
    camera: interpolateCamera(options.from, options.to, options.viewport),
  };
}

const progress = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));

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
      revealed: t >= half,
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
      revealed: true,
      done,
    };
  }

  const T = CONTINENT_TRANSITION;
  let cover: number;
  if (t < T.cloudsIn[1]) cover = tr.startCover + (1 - tr.startCover) * easeInOutSine(progress(t, T.cloudsIn));
  else if (t < T.cloudsOut[0]) cover = 1;
  else cover = 1 - easeInOutCubic(progress(t, T.cloudsOut));

  // The plane flies into the closing clouds, then shows up again at the destination.
  const intoClouds = 1 - smoothstep(380, 560, t);
  const atDestination = smoothstep(1330, 1480, t);
  return {
    camera: tr.camera(easeInOutCubic(progress(t, T.zoom))),
    cover: done ? 0 : cover,
    flight: easeInOutSine(progress(t, T.flight)),
    planeOpacity: done ? 0 : clamp01(t / 150) * Math.max(intoClouds, atDestination) * (1 - smoothstep(1600, 1800, t)),
    trailOpacity: done ? 0 : 1 - smoothstep(1450, 1800, t),
    mapOpacity: 1,
    revealed: t >= T.cloudsOut[0],
    done,
  };
}
