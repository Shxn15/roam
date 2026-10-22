import { INK_ANCHOR, PAPER_ANCHOR, contrastRatio, ensureContrast, isLight, mix, mostReadable, rgbTriplet } from './color';
import { BRAND, DERIVE, FONTS, STATIC_TOKENS, STATUS_COLORS, motionTokens, radiusTokens, type MotionLevel } from './tokens';
import { mapColorsOf } from './mapColors';
import type { Appearance, ThemeRecord } from './types';

export type TokenMap = Record<string, string>;

export function appearanceOf(theme: ThemeRecord): Appearance {
  return isLight(theme.colors.background) ? 'light' : 'dark';
}

/** Prefers the theme's own colors for text on `bg`; falls back to paper/ink only if none is readable. */
export function readableOn(bg: string, preferred: string[]): string {
  const best = mostReadable(bg, preferred);
  if (contrastRatio(best, bg) >= 4.5) return best;
  return mostReadable(bg, [...preferred, PAPER_ANCHOR, INK_ANCHOR]);
}

function shadow(rgb: string, alpha: number): Record<string, string> {
  const a = (f: number) => (alpha * f).toFixed(3);
  return {
    '--shadow-sm': `0 1px 2px rgb(${rgb} / ${a(0.5)})`,
    '--shadow-md': `0 1px 2px rgb(${rgb} / ${a(0.4)}), 0 6px 18px rgb(${rgb} / ${a(0.7)})`,
    '--shadow-lg': `0 2px 6px rgb(${rgb} / ${a(0.5)}), 0 18px 48px rgb(${rgb} / ${a(1)})`,
  };
}

/** Turns the seven color roles (plus tints) into every color token the UI uses. */
export function deriveColorTokens(theme: ThemeRecord): TokenMap {
  const { background, surface, accent, text, border, button, buttonText } = theme.colors;
  const appearance = appearanceOf(theme);
  const k = DERIVE[appearance];
  const status = STATUS_COLORS[appearance];

  const textMuted = ensureContrast(ensureContrast(mix(text, surface, 0.38), surface, 4.5), background, 4.5);
  const textSubtle = ensureContrast(mix(text, surface, 0.56), surface, 3);
  const accentText = ensureContrast(ensureContrast(accent, surface, 4.5), background, 4.5);
  const map = mapColorsOf(theme);
  const shadowRgb = rgbTriplet(appearance === 'light' ? mix(text, background, 0.2) : mix(background, INK_ANCHOR, 0.75));

  const tints: TokenMap = {};
  theme.tints.forEach((raw, i) => {
    // Chips put body text on tints, so every tint must stay readable under the theme's text color.
    const tint = ensureContrast(raw, text, 4.5);
    tints[`--tint-${i + 1}`] = tint;
    // A deeper version of each tint for dots, bars and icons that must stay visible.
    tints[`--tint-${i + 1}-strong`] = ensureContrast(mix(tint, accent, 0.15), surface, 3);
  });

  const statusTokens: TokenMap = {};
  for (const [name, color] of Object.entries(status)) {
    statusTokens[`--${name}`] = ensureContrast(color, surface, 4.5);
    statusTokens[`--${name}-soft`] = mix(surface, color, appearance === 'light' ? 0.12 : 0.2);
  }

  return {
    '--bg': background,
    '--surface': surface,
    '--surface-rgb': rgbTriplet(surface),
    '--surface-sunken': mix(surface, background, k.sunken),
    '--surface-hover': mix(surface, text, appearance === 'light' ? 0.04 : 0.07),
    '--text': text,
    '--text-muted': textMuted,
    '--text-subtle': textSubtle,
    '--border': border,
    '--border-strong': mix(border, text, 0.22),
    '--accent': accent,
    '--accent-text': accentText,
    '--accent-hover': mix(accent, appearance === 'light' ? text : surface, 0.14),
    '--accent-soft': mix(surface, accent, k.accentSoft),
    '--on-accent': readableOn(accent, [surface, text]),
    '--focus-ring': ensureContrast(accent, surface, 3),
    '--button': button,
    '--button-hover': mix(button, buttonText, 0.12),
    '--button-text': buttonText,
    ...tints,
    ...statusTokens,
    // The map reads only these variables; a theme switch never re-renders it.
    '--map-ocean': map.ocean,
    '--map-land': map.land,
    '--map-border': map.border,
    '--map-highlight': map.highlight,
    '--map-visited': map.highlight,
    '--map-visited-border': ensureContrast(mix(map.highlight, text, 0.4), map.highlight, 3),
    '--map-land-hover': mix(map.land, map.highlight, 0.35),
    '--map-focus': mix(map.highlight, accent, 0.45),
    '--map-graticule': mix(map.ocean, map.border, 0.2),
    '--map-dim-opacity': '0.45',
    // Continent transition: soft clouds and the haze behind them.
    '--cloud': appearance === 'light' ? mix(surface, PAPER_ANCHOR, 0.85) : mix(surface, text, 0.34),
    '--cloud-belly': appearance === 'light' ? mix(background, accent, 0.08) : mix(surface, text, 0.16),
    '--cloud-shade': appearance === 'light' ? mix(background, text, 0.24) : mix(background, INK_ANCHOR, 0.5),
    '--cloud-veil': appearance === 'light' ? mix(background, PAPER_ANCHOR, 0.5) : mix(background, text, 0.12),
    '--scrim': `rgb(${shadowRgb} / ${appearance === 'light' ? 0.22 : 0.55})`,
    '--logo-ink': appearance === 'light' ? BRAND.nightBlue : BRAND.cream,
    '--logo-plane': appearance === 'light' ? BRAND.periwinkle : BRAND.lavender,
    ...shadow(shadowRgb, k.shadowAlpha),
  };
}

export function fontTokens(theme: ThemeRecord): TokenMap {
  const display = FONTS[theme.fonts.display];
  const body = FONTS[theme.fonts.body];
  return {
    '--font-display': display.stack,
    '--font-display-variation': display.variation,
    '--font-body': body.stack,
    '--font-body-variation': body.variation,
    '--font-logo': FONTS.fredoka.stack,
  };
}

/** The complete set of custom properties for a theme. */
export function themeToCssVars(theme: ThemeRecord, motion: MotionLevel = 'full'): TokenMap {
  return {
    ...STATIC_TOKENS,
    ...radiusTokens(theme.radius),
    ...motionTokens(motion),
    ...fontTokens(theme),
    ...deriveColorTokens(theme),
  };
}
