// Performance bench, only in builds made with VITE_ROAM_BENCH=1 (never in a release).
// It drives the real UI with synthetic input and measures what the user would feel:
// frame times, how evenly the map moves, and how long a theme switch takes.
//
//   Browser:  await roamBench.run()            → results object
//   Desktop:  runs once after start and stores the results in settings('dev.bench')

import { isTauri } from '@tauri-apps/api/core';
import { bootstrap } from '../app/bootstrap';
import { getDb } from '../db/instance';
import { useThemeStore } from '../theme/themeStore';

const MAP = 'svg[aria-label="Weltkarte"]';
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mapSvg(): SVGSVGElement {
  const el = document.querySelector<SVGSVGElement>(MAP);
  if (!el) throw new Error('Karte nicht gefunden');
  return el;
}

/** The camera as drawn: translate(x y) scale(k) on the map's group. */
function camera(): { x: number; y: number; k: number } {
  const t = mapSvg().querySelector('g')?.getAttribute('transform') ?? '';
  const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([\d.]+)/.exec(t);
  return m ? { x: Number(m[1]), y: Number(m[2]), k: Number(m[3]) } : { x: NaN, y: NaN, k: NaN };
}

interface FrameStats {
  fps: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  /** Frames slower than 25 ms (visible stutter at 60 Hz). */
  slowFrames: number;
  frames: number;
}

interface MotionStats extends FrameStats {
  /** Share of frames in which the map actually moved (1 = continuous motion). */
  movingShare: number;
  /** Largest single-frame step as a share of the whole distance travelled (small = even). */
  maxStepShare: number;
}

function frameStats(times: number[]): FrameStats {
  const deltas = times.slice(1).map((t, i) => t - times[i]!);
  const sorted = [...deltas].sort((a, b) => a - b);
  const total = times.at(-1)! - times[0]!;
  return {
    fps: Math.round((deltas.length / total) * 1000 * 10) / 10,
    avgMs: round(total / deltas.length),
    p95Ms: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    maxMs: round(sorted.at(-1) ?? 0),
    slowFrames: deltas.filter((d) => d > 25).length,
    frames: deltas.length,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Records frame timestamps and the camera per frame while `drive` runs. Movement is
 * measured as zoom change (log scale, weighted like 300 px) plus translation of the map
 * point in the view center, so pans and zooms count alike.
 */
async function record(durationMs: number, drive: (elapsed: number) => void): Promise<MotionStats> {
  const times: number[] = [];
  const cams: { x: number; y: number; k: number }[] = [];
  const start = performance.now();
  for (;;) {
    const t = await nextFrame();
    times.push(t);
    cams.push(camera());
    if (t - start > durationMs) break;
    drive(t - start);
  }
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const steps = cams.slice(1).map((c, i) => {
    const p = cams[i]!;
    const zoom = Math.abs(Math.log(c.k) - Math.log(p.k)) * 300;
    const pan = Math.hypot((cx - c.x) / c.k - (cx - p.x) / p.k, (cy - c.y) / c.k - (cy - p.y) / p.k) * c.k;
    return zoom + pan;
  });
  const travelled = steps.reduce((a, b) => a + b, 0) || 1;
  return {
    ...frameStats(times),
    movingShare: round((steps.filter((s) => s > 0.01).length / steps.length) * 100) / 100,
    maxStepShare: round((Math.max(...steps) / travelled) * 100) / 100,
  };
}

function wheel(deltaY: number) {
  const svg = mapSvg();
  svg.dispatchEvent(
    new WheelEvent('wheel', { deltaY, deltaMode: 0, clientX: 900, clientY: 420, bubbles: true, cancelable: true }),
  );
}

/** A notched mouse wheel: one big step every 100 ms, in for 1.2 s, then out. */
async function benchWheelNotched(): Promise<MotionStats> {
  let next = 0;
  return record(2600, (elapsed) => {
    while (next <= elapsed && next < 2400) {
      wheel(next < 1200 ? -100 : 100);
      next += 100;
    }
  });
}

/** Trackpad / high-resolution wheel: small deltas about every 8 ms. */
async function benchTrackpad(): Promise<MotionStats> {
  let next = 0;
  return record(2600, (elapsed) => {
    while (next <= elapsed && next < 2400) {
      wheel(next < 1200 ? -5 : 5);
      next += 8;
    }
  });
}

async function benchDrag(): Promise<MotionStats> {
  const svg = mapSvg();
  const capture = Element.prototype.setPointerCapture;
  Element.prototype.setPointerCapture = () => undefined; // synthetic pointers cannot be captured
  const opts = (x: number, y: number) => ({ pointerId: 7, button: 0, isPrimary: true, clientX: x, clientY: y, bubbles: true });
  let x = 760;
  let y = 420;
  svg.dispatchEvent(new PointerEvent('pointerdown', opts(x, y)));
  const stats = await record(1200, (elapsed) => {
    if (elapsed > 1000) return;
    x += 5;
    y += 2;
    svg.dispatchEvent(new PointerEvent('pointermove', opts(x, y)));
  });
  svg.dispatchEvent(new PointerEvent('pointerup', opts(x, y)));
  Element.prototype.setPointerCapture = capture;
  return stats;
}

/** DOM changes outside the map while something animates (panels should stay untouched). */
function watchPanels() {
  const map = mapSvg().closest('div');
  let count = 0;
  const observer = new MutationObserver((records) => {
    for (const r of records) if (!map?.contains(r.target)) count++;
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  return () => {
    observer.disconnect();
    return count;
  };
}

async function benchCountryZoom(): Promise<FrameStats & { panelMutationsDuringZoom: number }> {
  location.hash = '#/land/JPN';
  await nextFrame();
  await nextFrame();
  const stop = watchPanels();
  const times: number[] = [];
  const start = performance.now();
  while (performance.now() - start < 1100) times.push(await nextFrame());
  const panelMutationsDuringZoom = stop();
  location.hash = '#/';
  await sleep(1300);
  return { ...frameStats(times), panelMutationsDuringZoom };
}

interface ThemeSwitch {
  /** From the switch until the frame with the new colors is on screen. */
  switchMs: number;
  /** The slowest frame in the 700 ms after the switch (fades, re-renders). */
  maxFrameAfterMs: number;
  slowFramesAfter: number;
}

async function measureThemeSwitch(trigger: () => void): Promise<ThemeSwitch> {
  await nextFrame();
  const t0 = performance.now();
  trigger();
  await nextFrame();
  const t1 = await nextFrame();
  const times = [t1];
  while (performance.now() - t0 < 700) times.push(await nextFrame());
  const deltas = times.slice(1).map((t, i) => t - times[i]!);
  return {
    switchMs: round(t1 - t0),
    maxFrameAfterMs: round(Math.max(0, ...deltas)),
    slowFramesAfter: deltas.filter((d) => d > 25).length,
  };
}

const THEME_CYCLE = ['dunkel', 'pastell-bento', 'warm-dunkel', 'weiss-akzent', 'standard'];

function summarize(runs: ThemeSwitch[]) {
  const sorted = [...runs].sort((a, b) => a.switchMs - b.switchMs);
  return {
    medianSwitchMs: sorted[Math.floor(sorted.length / 2)]!.switchMs,
    maxSwitchMs: sorted.at(-1)!.switchMs,
    maxFrameAfterMs: Math.max(...runs.map((r) => r.maxFrameAfterMs)),
    slowFramesAfter: runs.reduce((s, r) => s + r.slowFramesAfter, 0),
  };
}

/** Theme switch with the map fully visible (store call, like the gallery click does). */
async function benchThemeMapVisible() {
  const runs: ThemeSwitch[] = [];
  for (const id of THEME_CYCLE) runs.push(await measureThemeSwitch(() => useThemeStore.getState().select(id)));
  return summarize(runs);
}

/** Theme switch the way people do it: clicking a card in the open settings. */
async function benchThemeFromSettings() {
  document.querySelector<HTMLButtonElement>('button[aria-label="Einstellungen"]')?.click();
  await sleep(900);
  const runs: ThemeSwitch[] = [];
  for (const id of THEME_CYCLE) {
    const name = { dunkel: 'Dunkel', 'pastell-bento': 'Pastell Bento', 'warm-dunkel': 'Warm dunkel', 'weiss-akzent': 'Weiß mit Akzent', standard: 'Standard' }[id]!;
    const card = [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(
      (b) => b.textContent?.trim().endsWith(name) && b.textContent.includes('Aa'),
    );
    runs.push(await measureThemeSwitch(() => card?.click()));
  }
  pressEscape();
  await sleep(800);
  return summarize(runs);
}

function pressEscape() {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

async function resetView() {
  pressEscape();
  await sleep(1300);
}

export async function run() {
  await bootstrap();
  while (!document.querySelector(MAP)) await sleep(50);
  useThemeStore.getState().select('standard');
  await sleep(1500);
  const results = {
    userAgent: navigator.userAgent,
    viewport: `${innerWidth}x${innerHeight}`,
    wheelNotched: await benchWheelNotched(),
    trackpad: (await resetView(), await benchTrackpad()),
    drag: (await resetView(), await benchDrag()),
    countryZoom: (await resetView(), await benchCountryZoom()),
    themeMapVisible: (await resetView(), await benchThemeMapVisible()),
    themeFromSettings: await benchThemeFromSettings(),
  };
  return results;
}

(window as unknown as { roamBench: unknown }).roamBench = { run };

if (isTauri()) {
  void (async () => {
    const results = await run();
    await getDb().execute(
      `INSERT INTO settings (key, value, updated_at) VALUES ('dev.bench', ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(results), new Date().toISOString()],
    );
  })();
}
