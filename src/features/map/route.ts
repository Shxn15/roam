import { lerp, type Point } from './camera';

/** A gently curved flight path: a quadratic Bézier from `from` over `control` to `to`. */
export interface Route {
  from: Point;
  control: Point;
  to: Point;
}

/** Bends the line a little to the north, so flights look like flights and not like rulers. */
export function makeRoute(from: Point, to: Point, minLength = 24): Route {
  let start: Point = from;
  if (Math.hypot(to[0] - from[0], to[1] - from[1]) < minLength) {
    // Already there: take a short hop so the plane still has somewhere to fly from.
    start = [to[0] - minLength * 1.6, to[1] + minLength * 0.6];
  }
  const dx = to[0] - start[0];
  const dy = to[1] - start[1];
  const length = Math.hypot(dx, dy);
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) [nx, ny] = [-nx, -ny];
  const bend = length * 0.2;
  return {
    from: start,
    control: [(start[0] + to[0]) / 2 + nx * bend, (start[1] + to[1]) / 2 + ny * bend],
    to,
  };
}

export function pointAt(r: Route, t: number): [number, number] {
  const a = [lerp(r.from[0], r.control[0], t), lerp(r.from[1], r.control[1], t)];
  const b = [lerp(r.control[0], r.to[0], t), lerp(r.control[1], r.to[1], t)];
  return [lerp(a[0]!, b[0]!, t), lerp(a[1]!, b[1]!, t)];
}

/** Direction of travel in degrees (0 = east, 90 = south in screen space). */
export function headingAt(r: Route, t: number): number {
  const dx = 2 * (1 - t) * (r.control[0] - r.from[0]) + 2 * t * (r.to[0] - r.control[0]);
  const dy = 2 * (1 - t) * (r.control[1] - r.from[1]) + 2 * t * (r.to[1] - r.control[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** The route as seen on screen: an affine camera maps a Bézier's control points directly. */
export function transformRoute(r: Route, map: (p: Point) => Point): Route {
  return { from: map(r.from), control: map(r.control), to: map(r.to) };
}
