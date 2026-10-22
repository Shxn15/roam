import { describe, expect, it } from 'vitest';
import { WORLD_BOX, continentBox } from '../../geo/atlas';
import { fitBox, interpolateCamera, mapToScreen, screenToMap, viewCenter, zoomAround, type Viewport } from './camera';
import { makeClouds, placeCloud } from './clouds';
import { LOD_FINE_FROM_K, MapController, lodFor } from './controller';
import { FOLLOW, approach } from './follow';
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

  it('reveals the countries once the zoom is over, while the clouds still clear', () => {
    expect(sampleTransition(tr, T.zoom[1] - 1).revealed).toBe(false);
    expect(sampleTransition(tr, T.zoom[1]).revealed).toBe(true);
    expect(sampleTransition(tr, T.zoom[1]).cover).toBeGreaterThan(0);
  });

  it('marks the moment the map is covered, to switch the emphasized continent unseen', () => {
    expect(sampleTransition(tr, 300).covered).toBe(false);
    expect(sampleTransition(tr, T.cloudsIn[1]).covered).toBe(true);
    expect(sampleTransition(tr, T.cloudsIn[1]).cover).toBe(1);
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

describe('damped following', () => {
  const target = { x: -820, y: -210, k: 3.4 };

  it('ends exactly on the target', () => {
    let cam = { x: 120, y: 40, k: 1.1 };
    let done = false;
    let frames = 0;
    while (!done && frames < 400) {
      ({ camera: cam, done } = approach(cam, target, [700, 400], 16.7, FOLLOW.zoomTau));
      frames++;
    }
    expect(done).toBe(true);
    expect(cam).toEqual(target);
    expect(frames).toBeLessThan(60); // about a second at 60 Hz, mostly a soft tail
  });

  it('keeps the point under the cursor in place while zooming', () => {
    const start = { x: 100, y: 50, k: 1.2 };
    const anchor: [number, number] = [640, 380];
    const goal = zoomAround(start, 3, anchor, { min: 0.1, max: 100 });
    const under = screenToMap(start, anchor);
    let cam = start;
    for (let i = 0; i < 5; i++) {
      cam = approach(cam, goal, anchor, 16, FOLLOW.zoomTau).camera;
      const now = screenToMap(cam, anchor);
      expect(now[0]).toBeCloseTo(under[0], 9);
      expect(now[1]).toBeCloseTo(under[1], 9);
    }
  });

  it('does not depend on the frame rate', () => {
    const start = { x: 0, y: 0, k: 1 };
    const at60 = approach(start, target, [500, 300], 16, FOLLOW.zoomTau).camera;
    const at120 = approach(approach(start, target, [500, 300], 8, FOLLOW.zoomTau).camera, target, [500, 300], 8, FOLLOW.zoomTau).camera;
    expect(at120.k).toBeCloseTo(at60.k, 9);
    expect(at120.x).toBeCloseTo(at60.x, 6);
  });

  it('switches to detailed outlines only when zoomed in', () => {
    expect(lodFor(1.05)).toBe('coarse');
    expect(lodFor(LOD_FINE_FROM_K)).toBe('fine');
  });
});

describe('map controller', () => {
  const make = (motion: 'full' | 'reduced' = 'full') => {
    const log: string[] = [];
    const ctrl = new MapController(viewport, () => motion, {
      onSelect: (c) => log.push(`select:${c}`),
      onReveal: (c) => c && log.push(`reveal:${c}`),
      onMapSelection: (c) => log.push(`map:${c}`),
      onRest: () => log.push('rest'),
    });
    return { ctrl, log };
  };
  /** Runs the loop like requestAnimationFrame would, until nothing moves. */
  const settle = (ctrl: MapController, from: number, step = 16) => {
    let t = from;
    while (ctrl.animating && t < from + 10_000) ctrl.tick((t += step));
    return t;
  };

  it('ends on the chosen continent, telling the panels only at the right moments', () => {
    const { ctrl, log } = make();
    ctrl.select('europe', 0);
    expect(ctrl.selected).toBe('europe');
    ctrl.tick(300);
    expect(log).toEqual(['select:europe']); // map still unchanged while the clouds come
    ctrl.tick(T.cloudsIn[1]);
    expect(log).toEqual(['select:europe', 'map:europe']); // switched under full cover
    ctrl.tick(T.zoom[1] - 1);
    expect(log).toHaveLength(2); // no panel update during the zoom
    settle(ctrl, T.zoom[1] - 1);
    expect(ctrl.transition).toBeNull();
    expect(ctrl.camera).toEqual(fitBox(continentBox('europe'), viewport));
    expect(log).toEqual(['select:europe', 'map:europe', 'reveal:europe', 'rest']);
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
    settle(ctrl, 600);
    expect(ctrl.camera).toEqual(fitBox(continentBox('asia'), viewport));
    expect(log).toEqual(['select:europe', 'map:europe', 'select:asia', 'map:asia', 'reveal:asia', 'rest']);
  });

  it('can be interrupted while the clouds are clearing', () => {
    const { ctrl } = make();
    ctrl.select('africa', 0);
    ctrl.tick(1500);
    const cover = ctrl.frameAt(1500).cover;
    ctrl.select('oceania', 1500);
    expect(ctrl.frameAt(1500).cover).toBeCloseTo(cover, 9);
    settle(ctrl, 1500);
    expect(ctrl.camera).toEqual(fitBox(continentBox('oceania'), viewport));
  });

  it('goes back to the world on clear', () => {
    const { ctrl } = make();
    ctrl.select('south-america', 0);
    settle(ctrl, 0);
    ctrl.clear(2000);
    expect(ctrl.selected).toBeNull();
    settle(ctrl, 2000);
    expect(ctrl.camera).toEqual(fitBox(WORLD_BOX, viewport));
  });

  it('zooms to a country with the same loop and ends exactly there', () => {
    const { ctrl, log } = make();
    const box = [520, 110, 540, 125] as const;
    ctrl.focusBox(box, viewport.insets, 0);
    expect(ctrl.transition?.kind).toBe('glide');
    const target = ctrl.target;
    ctrl.tick(T.glideMs / 4);
    const quarter = ctrl.camera;
    expect(Math.log(quarter.k / fitBox(WORLD_BOX, viewport).k) / Math.log(target.k / fitBox(WORLD_BOX, viewport).k)).toBeLessThan(0.25); // eased start
    settle(ctrl, T.glideMs / 4);
    expect(ctrl.camera).toEqual(target);
    expect(log.filter((l) => l === 'rest')).toHaveLength(1);
  });

  it('only fades with reduced motion', () => {
    const { ctrl } = make('reduced');
    ctrl.select('asia', 0);
    expect(ctrl.transition?.kind).toBe('fade');
    expect(ctrl.frameAt(100).cover).toBe(0);
    settle(ctrl, 0);
    expect(ctrl.camera).toEqual(fitBox(continentBox('asia'), viewport));
  });

  it('glides wheel zoom to the target and ends exactly on it', () => {
    const { ctrl, log } = make();
    const start = ctrl.camera;
    ctrl.zoomBy(1.15, 0, { anchor: [900, 420] });
    ctrl.zoomBy(1.15, 5, { anchor: [900, 420] }); // two notches in quick succession add up
    const target = ctrl.target;
    expect(target.k).toBeCloseTo(start.k * 1.15 * 1.15, 9);
    expect(ctrl.camera).toEqual(start); // nothing jumps before the next frame
    ctrl.tick(16);
    expect(ctrl.camera.k).toBeGreaterThan(start.k);
    expect(ctrl.camera.k).toBeLessThan(target.k);
    settle(ctrl, 16);
    expect(ctrl.camera).toEqual(target);
    expect(log).toEqual(['rest']);
  });

  it('finishes a continent flight before manual zoom, and stops a glide where it is', () => {
    const { ctrl } = make();
    ctrl.select('europe', 0);
    ctrl.zoomBy(2, 100);
    expect(ctrl.transition).toBeNull();
    const europe = fitBox(continentBox('europe'), viewport);
    expect(ctrl.target.k).toBeCloseTo(europe.k * 2, 6);
    settle(ctrl, 100);
    ctrl.clear(5000);
    ctrl.tick(5000 + T.glideMs / 2);
    const midway = ctrl.camera;
    ctrl.panBy(40, -20, 5000 + T.glideMs / 2);
    expect(ctrl.transition).toBeNull();
    expect(ctrl.target.x).toBeCloseTo(midway.x + 40, 6);
    expect(ctrl.target.y).toBeCloseTo(midway.y - 20, 6);
  });

  it('lets a released drag glide out, limited in distance', () => {
    const { ctrl } = make();
    const start = ctrl.camera;
    ctrl.fling(10, 0, 0); // a very fast flick
    expect(ctrl.target.x - start.x).toBeLessThanOrEqual(600 + 1e-9);
    expect(ctrl.target.x).toBeGreaterThan(start.x);
  });
});

describe('flight to a country', () => {
  const japan = { id: 'JPN', box: [870, 150, 905, 205] as const, at: [890, 182] as const };
  const insets = { top: 64, right: 32, bottom: 48, left: 1060 };
  const make = (motion: 'full' | 'reduced' = 'full') => {
    const log: string[] = [];
    const ctrl = new MapController(viewport, () => motion, {
      onArrive: (id) => log.push(`arrive:${id}`),
      onFlightCancel: (id) => log.push(`cancel:${id}`),
      onRest: () => log.push('rest'),
    });
    ctrl.select('asia', 0);
    while (ctrl.animating) ctrl.tick(10_000);
    log.length = 0;
    return { ctrl, log };
  };
  const run = (ctrl: MapController, from: number) => {
    let t = from;
    while (ctrl.animating && t < from + 10_000) ctrl.tick((t += 16));
    return t;
  };

  it('takes about 2 s: plane, clouds, zoom under them, then a ring at the country', () => {
    const { ctrl, log } = make();
    const start = ctrl.camera;
    ctrl.flyToCountry(japan, insets, 1000);
    expect(ctrl.flight).toBe('JPN');
    const tr = ctrl.transition!;
    expect(tr.kind).toBe('clouds');
    expect(tr.duration).toBeGreaterThanOrEqual(1800);
    expect(tr.duration).toBeLessThanOrEqual(2200);
    expect(tr.route?.to).toEqual(japan.at); // from the continent to the country
    expect(sampleTransition(tr, 1000 + 200).planeOpacity).toBeGreaterThan(0.5);
    expect(sampleTransition(tr, 1000 + 800).cover).toBe(1); // the switch happens under the clouds
    close(sampleTransition(tr, 1000 + 300).camera, start);
    expect(sampleTransition(tr, 1000 + 1200).pop).toBeNull(); // no ring before landing
    const ring = sampleTransition(tr, 1000 + 1700);
    expect(ring.pop).toBeGreaterThan(0);
    expect(ring.pop).toBeLessThan(1);
    expect(ring.cover).toBe(0);
    run(ctrl, 1000);
    expect(log).toEqual(['rest', 'arrive:JPN']);
    expect(ctrl.flight).toBeNull();
    expect(ctrl.camera).toEqual(ctrl.restingCamera()); // framing the country beside the page
  });

  it('ends exactly where the country page frames the country, so the page adds no second zoom', () => {
    const { ctrl, log } = make();
    ctrl.flyToCountry(japan, insets, 0);
    const target = ctrl.target;
    run(ctrl, 0);
    expect(ctrl.camera).toEqual(target);
    ctrl.focusBox(japan.box, { ...insets }, 5000); // what the country page asks for once it opens
    expect(ctrl.animating).toBe(false);
    expect(log.filter((l) => l === 'rest')).toHaveLength(1);
  });

  it('lands at once on a second click', () => {
    const { ctrl, log } = make();
    ctrl.flyToCountry(japan, insets, 0);
    ctrl.tick(400);
    const target = ctrl.target;
    ctrl.finish();
    expect(log).toEqual(['rest', 'arrive:JPN']);
    expect(ctrl.camera).toEqual(target);
    expect(ctrl.frameAt(500).cover).toBe(0);
  });

  it('does not land when another choice replaces it', () => {
    const { ctrl, log } = make();
    ctrl.flyToCountry(japan, insets, 0);
    ctrl.tick(600);
    ctrl.select('europe', 600);
    run(ctrl, 600);
    expect(log).toContain('cancel:JPN');
    expect(log).not.toContain('arrive:JPN');
    expect(ctrl.camera).toEqual(fitBox(continentBox('europe'), viewport));
  });

  it('only fades out and in with reduced motion', () => {
    const { ctrl, log } = make('reduced');
    ctrl.flyToCountry(japan, insets, 0);
    expect(ctrl.transition?.kind).toBe('fade');
    expect(ctrl.transition?.duration).toBeLessThanOrEqual(400);
    const mid = ctrl.frameAt(100);
    expect(mid.cover).toBe(0);
    expect(mid.planeOpacity).toBe(0);
    expect(mid.pop).toBeNull();
    expect(mid.mapOpacity).toBeLessThan(1);
    run(ctrl, 0);
    expect(log).toEqual(['rest', 'arrive:JPN']);
  });
});
