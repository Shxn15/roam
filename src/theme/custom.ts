import { findPreset } from './presets';
import type { ThemeColors, ThemeRecord } from './types';

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function newCustomThemeId(name: string, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 5)
    .toString(36)
    .padStart(5, '0');
  return `${slugify(name) || 'theme'}-${suffix}`;
}

/** A new custom theme that keeps fonts, radius and tints of `base` and remembers its preset. */
export function createCustomTheme(base: ThemeRecord, colors: ThemeColors, name: string): ThemeRecord {
  return {
    ...base,
    id: newCustomThemeId(name),
    name: name.trim(),
    basedOn: base.basedOn ?? base.id,
    colors: { ...colors },
  };
}

/** The preset a theme returns to on "Zurücksetzen". */
export function resetBase(theme: ThemeRecord): ThemeRecord {
  return findPreset(theme.basedOn) ?? findPreset(theme.id) ?? theme;
}
