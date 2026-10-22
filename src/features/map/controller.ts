import { WORLD_BOX, boxCenter, continentBox, type Box } from '../../geo/atlas';
import type { ContinentId } from '../../geo/continents';
import type { MotionLevel } from '../../theme/tokens';
import {
  clampCamera,
  fitBox,
  screenToMap,
  viewCenter,
  zoomAround,
  type Camera,
  type Point,
  type Viewport,
  type ZoomLimits,
} from './camera';
import { FOLLOW, approach } from './follow';
import { makeRoute } from './route';
import { COUNTRY_TRANSITION, createTransition, sampleTransition, type Transition, type TransitionFrame } from './transition';

export interface MapEvents {
  /** The chosen continent (immediately, for the panels' selection state). */
  onSelect?(continent: ContinentId | null): void;
  /** The camera arrived at the continent: its countries may appear in the panel. */
  onReveal?(continent: ContinentId | null): void;
  /** Which continent the map emphasizes. Fired while the map is covered or fading. */
  onMapSelection?(continent: ContinentId | null): void;
  /** Nothing moves any more: the moment for work that would stutter during motion (detail level). */
  onRest?(camera: Camera): void;
  /** A country flight landed (or was skipped to its end): the country page may open. */
  onArrive?(countryId: string): void;
  /** A country flight was replaced by another move before it landed. */
  onFlightCancel?(countryId: string): void;
}

/** What a country flight needs to know about its destination. */
export interface FlightTarget {
  id: string;
  /** Bounds of the country's main part. */
  box: Box;
  /** Where the plane lands and the ring pops up. */
  at: Point;
}

/** What drives the camera: an eased, timed move (tween) or damped following of a target. */
type Motion =
  | { kind: 'tween'; tr: Transition }
  | { kind: 'follow'; target: Camera; anchor: Point; tau: number; last: number | null };

const stillFrame = (camera: Camera): TransitionFrame => ({
  camera,
  cover: 0,
  flight: 0,
  planeOpacity: 0,
  trailOpacity: 0,
  mapOpacity: 1,
  pop: null,
  covered: true,
  revealed: true,
  done: true,
});

/**
 * Owns the camera. Every movement – continent flights, country zoom, wheel, drag, keys –
 * runs through `tick`, called from one requestAnimationFrame loop. Framework-free and driven
 * by explicit timestamps, so it can be tested without a browser.
 */
export class MapController {
  camera: Camera;
  selected: ContinentId | null = null;
  revealed: ContinentId | null = null;
  /** The continent the map currently emphasizes (lags behind `selected` until covered). */
  mapSelected: ContinentId | null = null;
  private motion: Motion | null = null;
  private viewport: Viewport;
  /** The user panned or zoomed by hand since the last automatic framing. */
  private manual = false;
  /** Where the camera rests when nothing else is going on (a focused country, say). */
  private focus: { box: Box; insets?: Viewport['insets'] } | null = null;
  /** The country a running country flight lands in. */
  private flyingTo: string | null = null;

  constructor(
    viewport: Viewport,
    private motionLevel: () => MotionLevel,
    private events: MapEvents = {},
  ) {
    this.viewport = viewport;
    this.camera = this.restingCamera();
  }

  /** A programmatic, timed move (continent flight, country zoom, glide back). */
  get transition(): Transition | null {
    return this.motion?.kind === 'tween' ? this.motion.tr : null;
  }

  get animating(): boolean {
    return this.motion !== null;
  }

  /** The destination of the country flight in progress, if any. */
  get flight(): string | null {
    return this.flyingTo;
  }

  /** Where the camera is heading (the end of a tween or the follow target). */
  get target(): Camera {
    if (this.motion?.kind === 'tween') return this.motion.tr.to;
    if (this.motion?.kind === 'follow') return this.motion.target;
    return this.camera;
  }

  get limits(): ZoomLimits {
    const world = fitBox(WORLD_BOX, this.viewport);
    return { min: world.k * 0.75, max: world.k * 60 };
  }

  /** The camera the current state asks for when nothing is moving. */
  restingCamera(): Camera {
    if (this.focus) return fitBox(this.focus.box, { ...this.viewport, insets: this.focus.insets ?? this.viewport.insets });
    return fitBox(this.selected ? continentBox(this.selected) : WORLD_BOX, this.viewport);
  }

  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    if (this.motion?.kind === 'tween') {
      this.motion.tr = { ...this.motion.tr, to: this.restingCamera() };
      return;
    }
    if (this.motion?.kind === 'follow') {
      this.motion.target = this.clamp(this.motion.target);
      return;
    }
    this.camera = this.manual ? this.clamp(this.camera) : this.restingCamera();
  }

  /** The frame for `now` without advancing anything. */
  frameAt(now: number): TransitionFrame {
    return this.motion?.kind === 'tween' ? sampleTransition(this.motion.tr, now) : stillFrame(this.camera);
  }

  /** Flies to a continent. A second call while one is running retargets from wherever we are. */
  select(continent: ContinentId, now: number): void {
    if (continent === this.selected && !this.motion && !this.manual && !this.focus) return;
    const current = this.frameAt(now);
    this.cancelFlight();
    this.selected = continent;
    this.revealed = null;
    this.focus = null;
    this.manual = false;
    this.events.onSelect?.(continent);
    this.events.onReveal?.(null);

    const reduced = this.motionLevel() === 'reduced';
    const box = continentBox(continent);
    const from = current.camera;
    this.camera = from;
    this.motion = {
      kind: 'tween',
      tr: createTransition({
        kind: reduced ? 'fade' : 'clouds',
        now,
        from,
        to: fitBox(box, this.viewport),
        viewport: this.viewport,
        startCover: current.cover,
        route: reduced ? null : makeRoute(screenToMap(from, viewCenter(this.viewport)), boxCenter(box)),
      }),
    };
  }

  /**
   * Flies from where the camera is (the chosen continent) to a country with the continent
   * flight's layers: plane, clouds, zoom under them, then a ring pops up and `onArrive` fires.
   * The camera ends framing the country beside the country page (`insets`). With reduced
   * motion the map only fades out and in.
   */
  flyToCountry(target: FlightTarget, insets: Viewport['insets'] | undefined, now: number): void {
    const current = this.frameAt(now);
    this.cancelFlight();
    this.focus = { box: padBox(target.box, 14), insets };
    this.manual = false;
    this.flyingTo = target.id;
    const reduced = this.motionLevel() === 'reduced';
    const from = current.camera;
    this.camera = from;
    this.motion = {
      kind: 'tween',
      tr: createTransition({
        kind: reduced ? 'fade' : 'clouds',
        timing: COUNTRY_TRANSITION,
        now,
        from,
        to: this.restingCamera(),
        viewport: this.viewport,
        startCover: current.cover,
        route: reduced ? null : makeRoute(screenToMap(from, viewCenter(this.viewport)), target.at),
        popAt: target.at,
        arrival: target.id,
      }),
    };
  }

  /** Back to the whole world (Escape). */
  clear(now: number): void {
    if (!this.selected && !this.focus && !this.manual && !this.motion) return;
    const current = this.frameAt(now);
    this.cancelFlight();
    this.selected = null;
    this.revealed = null;
    this.focus = null;
    this.manual = false;
    this.events.onSelect?.(null);
    this.events.onReveal?.(null);
    this.tweenTo(this.restingCamera(), now, current);
  }

  /**
   * Zooms to a country (its main part) beside a panel: the same loop, with an ease curve.
   * Nothing happens if a country flight already brought the camera there.
   */
  focusBox(box: Box, insets: Viewport['insets'] | undefined, now: number): void {
    const focus = { box: padBox(box, 14), insets };
    if (!this.manual && this.focus && sameFocus(this.focus, focus) && (!this.motion || this.flyingTo)) return;
    const current = this.frameAt(now);
    this.cancelFlight();
    this.focus = focus;
    this.manual = false;
    this.tweenTo(this.restingCamera(), now, current);
  }

  releaseFocus(now: number): void {
    if (!this.focus) return;
    const current = this.frameAt(now);
    this.cancelFlight();
    this.focus = null;
    this.tweenTo(this.restingCamera(), now, current);
  }

  /** Zoom by a factor around a screen point (default: the view center). Damped. */
  zoomBy(factor: number, now: number, options: { anchor?: Point; tau?: number } = {}): void {
    const anchor = options.anchor ?? viewCenter(this.viewport);
    this.follow((t) => zoomAround(t, factor, anchor, this.limits), anchor, options.tau ?? FOLLOW.zoomTau, now);
  }

  /** Moves the map by screen pixels (drag, arrow keys). Damped. */
  panBy(dx: number, dy: number, now: number, options: { anchor?: Point; tau?: number } = {}): void {
    const anchor = options.anchor ?? viewCenter(this.viewport);
    this.follow((t) => ({ ...t, x: t.x + dx, y: t.y + dy }), anchor, options.tau ?? FOLLOW.stepTau, now);
  }

  /** Lets a drag glide out at the speed it was released with (px per ms). */
  fling(vx: number, vy: number, now: number): void {
    const scale = Math.min(1, FOLLOW.maxFlingPx / Math.max(1e-6, Math.hypot(vx, vy) * FOLLOW.flingMs));
    const dx = vx * FOLLOW.flingMs * scale;
    const dy = vy * FOLLOW.flingMs * scale;
    if (Math.hypot(dx, dy) < 2) return;
    this.panBy(dx, dy, now, { tau: FOLLOW.stepTau });
  }

  /** Advances time by one frame. */
  tick(now: number): TransitionFrame {
    const motion = this.motion;
    if (!motion) return stillFrame(this.camera);

    if (motion.kind === 'follow') {
      const dt = motion.last === null ? 16 : now - motion.last;
      motion.last = now;
      const step = approach(this.camera, motion.target, motion.anchor, dt, motion.tau);
      this.camera = step.camera;
      if (step.done) this.settle();
      return stillFrame(this.camera);
    }

    const frame = sampleTransition(motion.tr, now);
    this.camera = frame.camera;
    if (frame.covered && this.mapSelected !== this.selected) {
      this.mapSelected = this.selected;
      this.events.onMapSelection?.(this.selected);
    }
    if (frame.revealed && this.revealed !== this.selected) {
      this.revealed = this.selected;
      this.events.onReveal?.(this.selected);
    }
    if (frame.done) {
      this.settle();
      if (motion.tr.arrival && this.flyingTo === motion.tr.arrival) {
        this.flyingTo = null;
        this.events.onArrive?.(motion.tr.arrival);
      }
    }
    return frame;
  }

  /**
   * Jumps to the end of a running tween: before manual input during a flight, and for a
   * second click during a country flight, which lands at once.
   */
  finish(): void {
    if (this.motion?.kind !== 'tween') return;
    const tr = this.motion.tr;
    this.tick(tr.startedAt + tr.duration);
  }

  private settle(): void {
    this.motion = null;
    this.events.onRest?.(this.camera);
  }

  /** A new move replaces a country flight that has not landed yet. */
  private cancelFlight(): void {
    if (!this.flyingTo) return;
    const id = this.flyingTo;
    this.flyingTo = null;
    this.events.onFlightCancel?.(id);
  }

  /** Starts or extends damped following. Manual input interrupts programmatic moves. */
  private follow(update: (target: Camera) => Camera, anchor: Point, tau: number, now: number): void {
    let last: number | null = null;
    if (this.motion?.kind === 'tween') {
      if (this.motion.tr.kind === 'glide') {
        // Stop a glide where it is and take over from there.
        this.camera = sampleTransition(this.motion.tr, now).camera;
        this.motion = null;
      } else {
        // Continent flights finish at once (clouds cleared) before the user takes over.
        this.finish();
      }
    }
    if (this.motion?.kind === 'follow') last = this.motion.last;
    const base = this.motion?.kind === 'follow' ? this.motion.target : this.camera;
    this.manual = true;
    this.motion = { kind: 'follow', target: this.clamp(update(base)), anchor, tau, last };
  }

  private tweenTo(to: Camera, now: number, current: TransitionFrame): void {
    const reduced = this.motionLevel() === 'reduced';
    this.camera = current.camera;
    this.motion = {
      kind: 'tween',
      tr: createTransition({
        kind: reduced ? 'fade' : 'glide',
        now,
        from: current.camera,
        to,
        viewport: this.viewport,
        startCover: current.cover,
      }),
    };
  }

  private clamp(c: Camera): Camera {
    return clampCamera(c, this.viewport, WORLD_BOX, this.limits);
  }
}

const sameInsets = (a: Viewport['insets'] | undefined, b: Viewport['insets'] | undefined) =>
  a === b || (!!a && !!b && a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left);

function sameFocus(a: { box: Box; insets?: Viewport['insets'] }, b: { box: Box; insets?: Viewport['insets'] }): boolean {
  return a.box.every((v, i) => v === b.box[i]) && sameInsets(a.insets, b.insets);
}

/** Gives tiny countries some room around them, so Luxembourg is not framed edge to edge. */
function padBox(box: Box, minSize: number): Box {
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const padX = Math.max(w * 0.35, (minSize - w) / 2);
  const padY = Math.max(h * 0.35, (minSize - h) / 2);
  return [box[0] - padX, box[1] - padY, box[2] + padX, box[3] + padY];
}

/** Detail level for a zoom: the coarse outlines are enough while 1 map unit is under ~1.8 px. */
export const LOD_FINE_FROM_K = 1.8;
export const lodFor = (k: number): 'coarse' | 'fine' => (k >= LOD_FINE_FROM_K ? 'fine' : 'coarse');
