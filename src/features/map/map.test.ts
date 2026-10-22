import { describe, expect, it } from 'vitest';
import { WORLD_BOX, continentBox } from '../../geo/atlas';
import { fitBox, interpolateCamera, mapToScreen, screenToMap, viewCenter, zoomAround, type Viewport } from './camera';
import { makeClouds, placeCloud } from './clouds';
import { MapController } from './controller';
import { headingAt, makeRoute, pointAt } from './route';
import { CONTINENT_TRANSITION as T, createTransition, sampleTransition } from './transition';

const viewport: Viewport = { width: 1440, height: 900, insets: { top: 16, right: 80, bottom: 170, left: 330 } };
const close = (a: { x: number; y: number; k: number }, b: { x: number; y: number; k: number }) => {
  expect(a.k).toBeCloseTo(b.k, 6);
  expect(a.x).toBeCloseTo(b.x, 4);
  expect(a.y).toBeCloseTo(b.y, 4);
};

describe('camera', () => {
  it('fits a box into the free area, centered', () => {
    const box = continentBox('europe');
    const cam = fitBox(box, viewport);
    const [cx, cy] = viewCenter(viewport);
    const [sx, sy] = mapToScreen(cam, [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]);
    expect(sx).toBeCloseTo(cx, 6);
    expect(sy).toBeCloseTo(cy, 6);
    const [x0, y0] = mapToScreen(cam, [box[0], box[1]]);
    const [x1, y1] = mapToScreen(cam, [box[2], box[3]]);
    expect(x0).toBeGreaterThanOrEqual(viewport.insets.left - 1e-6);
    expect(x1).toBeLessThanOrEqual(viewport.width - viewport.insets.right + 1e-6);
    expect(y0).toBeGreaterThanOrEqual(viewport.insets.top - 1e-6);
    expect(y1).toBeLessThanOrEqual(viewport.height - viewport.insets.bottom + 1e-6);
  });

  it('zooms around a fixed point and respects limits', () => {
    const cam = fitBox(WORLD_BOX, viewport);
    const anchor: [number, number] = [700, 400];
    const before = screenToMap(cam, anchor);
    const zoomed = zoomAround(cam, 2, anchor, { min: 0.1, max: 100 });
    expect(zoomed.k).toBeCloseTo(cam.k * 2, 9);
    const after = screenToMap(zoomed, anchor);
    expect(after[0]).toBeCloseTo(before[0], 9);
    expect(after[1]).toBeCloseTo(before[1], 9);
    expect(zoomAround(cam, 1000, anchor, { min: 0.1, max: cam.k * 3 }).k).toBeCloseTo(cam.k * 3, 9);
  });

  it('interpolates from start to end', () => {
    const a = fitBox(WORLD_BOX, viewport);
    const b = fitBox(continentBox('asia'), viewport);
    const path = interpolateCamera(a, b, viewport);
    close(path(0), a);
    close(path(1), b);
    expect(path(0.5).k).toBeCloseTo(Math.sqrt(a.k * b.k), 6);
  });
});

describe('flight route', () => {
  it('starts and ends where asked, bending north', () => {
    const r = makeRoute([100, 300], [500, 300]);
    expect(pointAt(r, 0)).toEqual([100, 300]);
    expect(pointAt(r, 1)).toEqual([500, 300]);
    expect(pointAt(r, 0.5)[1]).toBeLessThan(300);
    expect(headingAt(r, 0)).toBeLessThan(0); // climbing (screen y up)
    expect(headingAt(r, 1)).toBeGreaterThan(0); // descending
  });

  it('takes a short hop when start and destination coincide', () => {
    const r = makeRoute([200, 200], [201, 200]);
    expect(Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1])).toBeGreaterThan(24);
  });
});

describe('clouds', () => {
  it('are off screen without cover and on screen at full cover', () => {
    for (const cloud of makeClouds(T.cloudCount)) {
      const out = placeCloud(cloud, 0, 1440, 900, 0);
      const offscreen = out.x + out.width < 0 || out.x > 1440 || out.y + out.height < 0 || out.y > 900;
      expect(offscreen).toBe(true);
      const at = placeCloud(cloud, 1, 1440, 900, 0);
      expect(at.x + at.width / 2).toBeGreaterThan(0);
      expect(at.x + at.width / 2).toBeLessThan(1440);
    }
  });

  it('is deterministic and uses the configured count', () => {
    expect(makeClouds(T.cloudCount)).toEqual(makeClouds(T.cloudCount));
    expect(makeClouds(T.cloudCount)).toHaveLength(T.cloudCount);
  });
});

describe('transition timeline', () => {
  const from = fitBox(WORLD_BOX, viewport);
  const to = fitBox(continentBox('africa'), viewport);
  const tr = createTransition({ kind: 'clouds', now: 0, from, to, viewport });

  it('rolls clouds in, zooms under them and clears them', () => {
    expect(sampleTransition(tr, 0).cover).toBe(0);
    expect(sampleTransition(tr, 250).cover).toBeCloseTo(0.5, 6); // halfway through phase 1
    expect(sampleTransition(tr, 400).cover).toBeGreaterThan(0.85);
    expect(sampleTransition(tr, 900).cover).toBe(1); // middle: fully covered
    close(sampleTransition(tr, 300).camera, from); // zoom waits for the clouds
    expect(sampleTransition(tr, 900).camera.k).toBeGreaterThan(from.k);
    close(sampleTransition(tr, 1400).camera, to);
    expect(sampleTransition(tr, 1700).cover).toBeLessThan(0.2);
    const end = sampleTransition(tr, T.durationMs);
    expect(end).toMatchObject({ cover: 0, done: true, revealed: true, planeOpacity: 0 });
  });

  it('hides the plane in the clouds and shows it at the destination', () => {
    expect(sampleTransition(tr, 200).planeOpacity).toBeGreaterThan(0.5);
    expect(sampleTransition(tr, 900).planeOpacity).toBe(0);
    const late = sampleTransition(tr, 1500);
    expect(late.flight).toBe(1);
    expect(late.planeOpacity).toBeGreaterThan(0.3);
  });

  it('reveals the countries only in phase 3', () => {
    expect(sampleTransition(tr, 1199).revealed).toBe(false);
    expect(sampleTransition(tr, 1200).revealed).toBe(true);
  });

  it('just fades with reduced motion', () => {
    const fade = createTransition({ kind: 'fade', now: 0, from, to, viewport });
    expect(sampleTransition(fade, 90).mapOpacity).toBeCloseTo(0.5, 5);
    expect(sampleTransition(fade, 90).cover).toBe(0);
    expect(sampleTransition(fade, 90).planeOpacity).toBe(0);
    close(sampleTransition(fade, 200).camera, to);
    expect(sampleTransition(fade, T.fadeMs).done).toBe(true);
  });
});

describe('map controller', () => {
  const make = (motion: 'full' | 'reduced' = 'full') => {
    const log: string[] = [];
    const ctrl = new MapController(viewport, () => motion, {
      onSelect: (c) => log.push(`select:${c}`),
      onReveal: (c) => c && log.push(`reveal:${c}`),
    });
    return { ctrl, log };
  };

  it('ends on the chosen continent', () => {
    const { ctrl, log } = make();
    ctrl.select('europe', 0);
    expect(ctrl.selected).toBe('europe');
    for (let t = 0; t <= T.durationMs; t += 16) ctrl.tick(t);
    ctrl.tick(T.durationMs);
    expect(ctrl.transition).toBeNull();
    close(ctrl.camera, fitBox(continentBox('europe'), viewport));
    expect(log).toEqual(['select:europe', 'reveal:europe']);
  });

  it('accepts a new choice mid-flight and ends on the new continent', () => {
    const { ctrl, log } = make();
    ctrl.select('europe', 0);
    ctrl.tick(600);
    const midway = ctrl.camera;
    ctrl.select('asia', 600);
    expect(ctrl.selected).toBe('asia');
    close(ctrl.frameAt(600).camera, midway); // no jump: starts where we were
    expect(ctrl.frameAt(600).cover).toBe(1); // clouds stay closed
    for (let t = 600; t <= 600 + T.durationMs; t += 16) ctrl.tick(t);
    ctrl.tick(600 + T.durationMs);
    expect(ctrl.transition).toBeNull();
    close(ctrl.camera, fitBox(continentBox('asia'), viewport));
    expect(log).toEqual(['select:europe', 'select:asia', 'reveal:asia']);
  });

  it('can be interrupted while the clouds are clearing', () => {
    const { ctrl } = make();
    ctrl.select('africa', 0);
    ctrl.tick(1500);
    const cover = ctrl.frameAt(1500).cover;
    ctrl.select('oceania', 1500);
    expect(ctrl.frameAt(1500).cover).toBeCloseTo(cover, 9);
    ctrl.tick(1500 + T.durationMs);
    close(ctrl.camera, fitBox(continentBox('oceania'), viewport));
  });

  it('goes back to the world on clear', () => {
    const { ctrl } = make();
    ctrl.select('south-america', 0);
    ctrl.tick(T.durationMs);
    ctrl.clear(2000);
    expect(ctrl.selected).toBeNull();
    ctrl.tick(2000 + T.glideMs);
    close(ctrl.camera, fitBox(WORLD_BOX, viewport));
  });

  it('only fades with reduced motion', () => {
    const { ctrl } = make('reduced');
    ctrl.select('asia', 0);
    expect(ctrl.transition?.kind).toBe('fade');
    expect(ctrl.frameAt(100).cover).toBe(0);
    ctrl.tick(T.fadeMs);
    close(ctrl.camera, fitBox(continentBox('asia'), viewport));
  });

  it('finishes a transition before manual zoom and pan', () => {
    const { ctrl } = make();
    ctrl.select('europe', 0);
    ctrl.zoomBy(2, 100);
    expect(ctrl.transition).toBeNull();
    expect(ctrl.camera.k).toBeCloseTo(fitBox(continentBox('europe'), viewport).k * 2, 6);
    const before = ctrl.camera;
    ctrl.panBy(40, -20);
    expect(ctrl.camera.x).toBeCloseTo(before.x + 40, 6);
    expect(ctrl.camera.y).toBeCloseTo(before.y - 20, 6);
  });
});
