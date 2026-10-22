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
import { makeRoute } from './route';
import { createTransition, sampleTransition, type Transition, type TransitionFrame } from './transition';

export interface MapEvents {
  /** The selected continent changed (immediately when a transition starts). */
  onSelect?(continent: ContinentId | null): void;
  /** Phase 3 of a transition: the selected continent is visible, its countries may appear. */
  onReveal?(continent: ContinentId | null): void;
}

const IDLE_FRAME = (camera: Camera): TransitionFrame => ({
  camera,
  cover: 0,
  flight: 0,
  planeOpacity: 0,
  trailOpacity: 0,
  mapOpacity: 1,
  revealed: true,
  done: true,
});

/**
 * Owns the camera and the running transition. Framework-free and driven by explicit
 * timestamps, so the whole timeline can be tested without a browser.
 */
export class MapController {
  camera: Camera;
  transition: Transition | null = null;
  selected: ContinentId | null = null;
  revealed: ContinentId | null = null;
  private viewport: Viewport;
  /** The user panned or zoomed by hand since the last automatic framing. */
  private manual = false;
  /** Where the camera rests when nothing else is going on (a focused country, say). */
  private focus: { box: Box; insets?: Viewport['insets'] } | null = null;

  constructor(
    viewport: Viewport,
    private motion: () => MotionLevel,
    private events: MapEvents = {},
  ) {
    this.viewport = viewport;
    this.camera = this.restingCamera();
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
    if (this.transition) {
      this.transition = { ...this.transition, to: this.restingCamera() };
      return;
    }
    this.camera = this.manual ? this.clamp(this.camera) : this.restingCamera();
  }

  /** The current frame of a running transition, or a still frame. */
  frameAt(now: number): TransitionFrame {
    return this.transition ? sampleTransition(this.transition, now) : IDLE_FRAME(this.camera);
  }

  /** Flies to a continent. A second call while one is running retargets from wherever we are. */
  select(continent: ContinentId, now: number): void {
    if (continent === this.selected && !this.transition && !this.manual && !this.focus) return;
    const current = this.frameAt(now);
    this.selected = continent;
    this.revealed = null;
    this.focus = null;
    this.manual = false;
    this.events.onSelect?.(continent);
    this.events.onReveal?.(null);

    const reduced = this.motion() === 'reduced';
    const box = continentBox(continent);
    const from = current.camera;
    this.transition = createTransition({
      kind: reduced ? 'fade' : 'clouds',
      now,
      from,
      to: fitBox(box, this.viewport),
      viewport: this.viewport,
      startCover: current.cover,
      route: reduced ? null : makeRoute(screenToMap(from, viewCenter(this.viewport)), boxCenter(box)),
    });
    this.camera = from;
  }

  /** Back to the whole world (Escape). */
  clear(now: number): void {
    if (!this.selected && !this.focus && !this.manual && !this.transition) return;
    const current = this.frameAt(now);
    this.selected = null;
    this.revealed = null;
    this.focus = null;
    this.manual = false;
    this.events.onSelect?.(null);
    this.events.onReveal?.(null);
    this.glideTo(this.restingCamera(), now, current);
  }

  /** Frames a country (its main part) beside a panel, e.g. on the country page. */
  focusBox(box: Box, insets: Viewport['insets'] | undefined, now: number): void {
    const current = this.frameAt(now);
    this.focus = { box: padBox(box, 14), insets };
    this.manual = false;
    this.glideTo(this.restingCamera(), now, current);
  }

  releaseFocus(now: number): void {
    if (!this.focus) return;
    const current = this.frameAt(now);
    this.focus = null;
    this.glideTo(this.restingCamera(), now, current);
  }

  /** Zoom by a factor around a screen point (default: the view center). */
  zoomBy(factor: number, now: number, options: { anchor?: Point; animate?: boolean } = {}): void {
    this.finish();
    const anchor = options.anchor ?? viewCenter(this.viewport);
    const target = this.clamp(zoomAround(this.camera, factor, anchor, this.limits));
    this.manual = true;
    if (options.animate) this.glideTo(target, now, this.frameAt(now), 260);
    else this.camera = target;
  }

  panBy(dx: number, dy: number): void {
    this.finish();
    this.manual = true;
    this.camera = this.clamp({ ...this.camera, x: this.camera.x + dx, y: this.camera.y + dy });
  }

  /** Advances time. Returns the frame to draw. */
  tick(now: number): TransitionFrame {
    const frame = this.frameAt(now);
    this.camera = frame.camera;
    if (this.transition && frame.revealed && this.revealed !== this.selected) {
      this.revealed = this.selected;
      this.events.onReveal?.(this.selected);
    }
    if (this.transition && frame.done) this.transition = null;
    return frame;
  }

  /** Jumps to the end of a running transition (used before manual pan and zoom). */
  finish(): void {
    if (!this.transition) return;
    this.tick(this.transition.startedAt + this.transition.duration);
  }

  private glideTo(to: Camera, now: number, current: TransitionFrame, duration?: number): void {
    const reduced = this.motion() === 'reduced';
    this.transition = createTransition({
      kind: reduced ? 'fade' : 'glide',
      now,
      from: current.camera,
      to,
      viewport: this.viewport,
      startCover: current.cover,
      duration: reduced ? undefined : duration,
    });
    this.camera = current.camera;
  }

  private clamp(c: Camera): Camera {
    return clampCamera(c, this.viewport, WORLD_BOX, this.limits);
  }
}

/** Gives tiny countries some room around them, so Luxembourg is not framed edge to edge. */
function padBox(box: Box, minSize: number): Box {
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const padX = Math.max(w * 0.35, (minSize - w) / 2);
  const padY = Math.max(h * 0.35, (minSize - h) / 2);
  return [box[0] - padX, box[1] - padY, box[2] + padX, box[3] + padY];
}
