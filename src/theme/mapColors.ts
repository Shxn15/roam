import { contrastRatio, ensureContrast, fromOklch, isLight, lightnessPoints, mix, toOklab, toOklch } from './color';
import type { MapColors, ThemeRecord } from './types';

/** Land and sea must differ by at least this many OKLCH lightness points. */
export const MAP_MIN_LIGHTNESS_GAP = 8;
/** Borders against the land (WCAG ratio), for thin 0.5–0.75 px lines. */
export const MAP_MIN_BORDER_CONTRAST = 3;

/** Moves hue `from` toward `to` by `amount`, the short way round. */
function towardHue(from: number, to: number, amount: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * amount + 360) % 360;
}

/**
 * Map colors for a theme that has none of its own (a custom theme after its background
 * changed). Same rules as the presets: the sea a little cooler and darker than the
 * background, the land clearly lighter than the sea, borders readable on the land.
 * Dark themes mirror this: deep sea, lighter land, light borders.
 */
export function deriveMapColors(theme: ThemeRecord): MapColors {
  const { background, text, accent } = theme.colors;
  const bg = toOklch(background);
  const neutral = bg.c < 0.02;
  let ocean: string;
  let land: string;
  if (isLight(background)) {
    const seaL = Math.min(bg.l - 0.06, 0.885);
    ocean = fromOklch({ l: seaL, c: 0.02, h: neutral ? 232 : towardHue(bg.h, 232, 0.7) });
    land = fromOklch({ l: Math.min(0.99, seaL + 0.1), c: 0.014, h: 88 });
  } else {
    const seaL = Math.max(0.1, bg.l - 0.04);
    ocean = fromOklch({ l: seaL, c: Math.max(0.02, bg.c), h: neutral ? 262 : towardHue(bg.h, 262, 0.5) });
    land = fromOklch({ l: seaL + 0.14, c: Math.min(0.05, bg.c + 0.01), h: neutral ? 262 : bg.h });
  }
  const landL = toOklch(land).l;
  return {
    ocean,
    land,
    border: ensureContrast(mix(land, text, 0.5), land, MAP_MIN_BORDER_CONTRAST),
    highlight: fromOklch({ l: isLight(background) ? landL - 0.22 : landL + 0.2, c: 0.09, h: toOklch(accent).h }),
  };
}

export function mapColorsOf(theme: ThemeRecord): MapColors {
  return theme.map ?? deriveMapColors(theme);
}

export interface MapContrastReport {
  /** OKLCH lightness points between land and sea. */
  lightnessGap: number;
  borderContrast: number;
  /** The sea is darker than the app background. */
  seaDarker: boolean;
  /** The sea is cooler (bluer in OKLab b) than the app background. */
  seaCooler: boolean;
}

export function mapContrast(theme: ThemeRecord): MapContrastReport {
  const map = mapColorsOf(theme);
  const bg = theme.colors.background;
  return {
    lightnessGap: Math.abs(lightnessPoints(map.land) - lightnessPoints(map.ocean)),
    borderContrast: contrastRatio(map.border, map.land),
    seaDarker: lightnessPoints(map.ocean) < lightnessPoints(bg),
    seaCooler: toOklab(map.ocean).b < toOklab(bg).b,
  };
}
