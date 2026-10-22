import config from './countries.json';
import { ensureContrast, isHexColor, mix } from './color';
import { appearanceOf, readableOn, type TokenMap } from './derive';
import { isPatternId, type PatternId } from './patterns';
import { DERIVE } from './tokens';
import type { ThemeRecord } from './types';

/**
 * A country's own theme, used only inside its country tab (and for the ring that pops up when
 * the plane lands there): an accent for active states and a header pattern.
 */
export interface CountryTheme {
  /** Natural Earth id, e.g. "JPN". */
  id: string;
  /** The country's color as configured; the tokens make it readable on every app theme. */
  accent: string;
  pattern: PatternId;
  /** For screen readers and the README. */
  patternLabel: string;
}

/** Opacity of the header pattern: 3–6 %, a little more on dark backgrounds where thin lines fade. */
export const PATTERN_OPACITY = { light: 0.05, dark: 0.06 } as const;

function parseConfig(raw: Record<string, { accent: string; pattern: string; patternLabel: string }>): CountryTheme[] {
  return Object.entries(raw).map(([id, entry]) => {
    if (!/^[A-Z0-9]{3}$/.test(id)) throw new Error(`Länder-Theme: ungültige Länder-ID ${id}`);
    if (!isHexColor(entry.accent)) throw new Error(`Länder-Theme ${id}: ungültige Akzentfarbe ${entry.accent}`);
    if (!isPatternId(entry.pattern)) throw new Error(`Länder-Theme ${id}: unbekanntes Muster ${entry.pattern}`);
    return { id, accent: entry.accent, pattern: entry.pattern, patternLabel: entry.patternLabel };
  });
}

/** Every configured country theme (src/theme/countries.json). */
export const COUNTRY_THEMES: readonly CountryTheme[] = parseConfig(config);

const byId = new Map(COUNTRY_THEMES.map((c) => [c.id, c]));

export function countryTheme(id: string): CountryTheme | undefined {
  return byId.get(id);
}

/** The custom properties of one country theme on top of an app theme. */
export function countryTokens(country: CountryTheme, theme: ThemeRecord): TokenMap {
  const { surface, background, text } = theme.colors;
  const appearance = appearanceOf(theme);
  const accent = ensureContrast(country.accent, surface, 3);
  return {
    '--country-accent': accent,
    '--country-accent-text': ensureContrast(ensureContrast(country.accent, surface, 4.5), background, 4.5),
    '--country-accent-soft': mix(surface, accent, DERIVE[appearance].accentSoft),
    '--country-on-accent': readableOn(accent, [surface, text]),
    '--country-pattern-opacity': String(PATTERN_OPACITY[appearance]),
  };
}

/**
 * Inside a themed country tab, the app's accent tokens take the country's values, so every
 * active state there (chosen tab, segment, focus ring, progress) speaks the country's color.
 */
function accentOverrides(tokens: TokenMap, theme: ThemeRecord): TokenMap {
  const appearance = appearanceOf(theme);
  return {
    '--accent': tokens['--country-accent']!,
    '--accent-text': tokens['--country-accent-text']!,
    '--accent-soft': tokens['--country-accent-soft']!,
    '--accent-hover': mix(tokens['--country-accent']!, appearance === 'light' ? theme.colors.text : theme.colors.surface, 0.14),
    '--on-accent': tokens['--country-on-accent']!,
    '--focus-ring': tokens['--country-accent']!,
  };
}

const declarations = (tokens: TokenMap) =>
  Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(';');

/**
 * CSS rules for all country themes, written into the theme stylesheet together with :root, so
 * a theme switch recolors them in the same single update. Countries without a theme of their
 * own fall back to the app's accent and show no pattern.
 */
export function countryThemeRules(theme: ThemeRecord): string {
  const fallback = declarations({
    '--country-accent': 'var(--accent)',
    '--country-accent-text': 'var(--accent-text)',
    '--country-accent-soft': 'var(--accent-soft)',
    '--country-on-accent': 'var(--on-accent)',
    '--country-pattern-opacity': '0',
  });
  // Countries with their own theme get literal values (the fallback points at the app's
  // accent, so overriding the accent there would be circular).
  const own = COUNTRY_THEMES.map((c) => {
    const tokens = countryTokens(c, theme);
    return `[data-country-theme="${c.id}"]{${declarations({ ...tokens, ...accentOverrides(tokens, theme) })}}`;
  }).join('');
  return `[data-country-theme]{${fallback}}${own}`;
}
