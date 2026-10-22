import { lerp, screenToMap, type Camera, type Point } from './camera';

/**
 * Damping for interactive moves: the shown camera chases a target camera. `tau` is the time
 * constant in ms (after `tau` about 63 % of the remaining way is done). Frame-rate
 * independent, so 120 Hz and 60 Hz screens feel the same.
 */
export const FOLLOW = {
  /** Mouse wheel and trackpad zoom. */
  zoomTau: 85,
  /** Dragging: quick enough to feel attached, soft enough to glide out. */
  dragTau: 35,
  /** Buttons and arrow keys. */
  stepTau: 110,
  /** After letting go of a drag, the map keeps going this long at the release speed. */
  flingMs: 200,
  maxFlingPx: 600,
} as const;

/**
 * One damping step. The map point under `anchor` moves straight toward its target spot
 * while the zoom changes geometrically, so a zoom around the cursor keeps the cursor's point
 * exactly in place. Ends exactly on the target once it is closer than a twentieth pixel.
 */
export function approach(
  current: Camera,
  target: Camera,
  anchor: Point,
  dtMs: number,
  tau: number,
): { camera: Camera; done: boolean } {
  const a = 1 - Math.exp(-Math.max(0, dtMs) / tau);
  const k = current.k * (target.k / current.k) ** a;
  const [cx, cy] = screenToMap(current, anchor);
  const [tx, ty] = screenToMap(target, anchor);
  const mx = lerp(cx, tx, a);
  const my = lerp(cy, ty, a);
  const next = { k, x: anchor[0] - mx * k, y: anchor[1] - my * k };
  const settled =
    Math.abs(Math.log(next.k / target.k)) < 1e-4 && Math.abs(next.x - target.x) < 0.05 && Math.abs(next.y - target.y) < 0.05;
  return settled ? { camera: target, done: true } : { camera: next, done: false };
}
