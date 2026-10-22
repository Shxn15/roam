import { appearanceOf, themeToCssVars } from './derive';
import { parseTheme } from './schema';
import type { MotionLevel } from './tokens';
import type { ThemeRecord } from './types';

const CACHE_KEY = 'roam.theme-cache';
const STYLE_ID = 'roam-theme';
const SWITCHING = 'theme-switching';

/** All tokens of a theme as one `:root` rule. */
export function themeStylesheet(theme: ThemeRecord, motion: MotionLevel): string {
  const vars = themeToCssVars(theme, motion);
  return `:root{${Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`;
}

let release = 0;

/**
 * Applies a theme in one step: a single stylesheet update, so panels and map change in the
 * same frame and nothing re-renders. While that frame is drawn all transitions are off (no
 * hover fade on every button); only the backdrop – body and sea – fades briefly.
 */
export function applyTheme(theme: ThemeRecord, motion: MotionLevel, doc: Document = document): void {
  const root = doc.documentElement;
  let sheet = doc.getElementById(STYLE_ID);
  if (!sheet) {
    sheet = doc.createElement('style');
    sheet.id = STYLE_ID;
    doc.head.appendChild(sheet);
  }
  root.classList.add(SWITCHING);
  sheet.textContent = themeStylesheet(theme, motion);
  const appearance = appearanceOf(theme);
  root.dataset.appearance = appearance;
  root.dataset.motion = motion;
  root.style.colorScheme = appearance;

  const view = doc.defaultView;
  const token = ++release;
  const done = () => token === release && root.classList.remove(SWITCHING);
  if (view?.requestAnimationFrame) view.requestAnimationFrame(() => view.requestAnimationFrame(done));
  else setTimeout(done, 50);
}

/** The last active theme, so the next start paints in the right colors before the database is open. */
export function cacheTheme(theme: ThemeRecord): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch {
    // Storage can be unavailable; the database remains the source of truth.
  }
}

export function readCachedTheme(): ThemeRecord | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? parseTheme(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
