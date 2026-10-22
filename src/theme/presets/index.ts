import standard from './01-standard.json';
import pastellBento from './02-pastell-bento.json';
import dunkel from './03-dunkel.json';
import warmDunkel from './04-warm-dunkel.json';
import weissAkzent from './05-weiss-akzent.json';
import { parseTheme } from '../schema';
import type { ThemeRecord } from '../types';

/** Built-in presets in display order. */
export const PRESETS: readonly ThemeRecord[] = [standard, pastellBento, dunkel, warmDunkel, weissAkzent].map(parseTheme);

export const DEFAULT_THEME_ID = 'standard';

export function findPreset(id: string | null | undefined): ThemeRecord | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function isPresetId(id: string): boolean {
  return PRESETS.some((p) => p.id === id);
}

export function defaultTheme(): ThemeRecord {
  return PRESETS[0]!;
}
