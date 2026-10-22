import { appearanceOf, themeToCssVars } from './derive';
import { parseTheme } from './schema';
import type { MotionLevel } from './tokens';
import type { ThemeRecord } from './types';

const CACHE_KEY = 'roam.theme-cache';

/** Writes all tokens of `theme` as CSS custom properties onto `root` (default: <html>). */
export function applyTheme(theme: ThemeRecord, motion: MotionLevel, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(themeToCssVars(theme, motion))) {
    root.style.setProperty(name, value);
  }
  const appearance = appearanceOf(theme);
  root.dataset.appearance = appearance;
  root.dataset.motion = motion;
  root.style.colorScheme = appearance;
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Switching between themes cross-fades colors with plain CSS transitions (see
 * `.theme-fading` in global.css). The View Transitions API is deliberately not used:
 * it crashes WebKitGTK, the webview behind Tauri on Linux.
 */
export function applyThemeSmoothly(theme: ThemeRecord, motion: MotionLevel): void {
  const root = document.documentElement;
  if (motion === 'full') {
    clearTimeout(fadeTimer);
    root.classList.add('theme-fading');
    fadeTimer = setTimeout(() => root.classList.remove('theme-fading'), 700);
  }
  applyTheme(theme, motion);
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
