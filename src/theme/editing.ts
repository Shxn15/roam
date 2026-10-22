import { INK_ANCHOR, PAPER_ANCHOR, isLight, mix } from './color';
import { fixContrast } from './contrast';
import type { ColorRole, ThemeRecord } from './types';

/**
 * Applies one color change from the editor. When a new background flips the theme
 * between light and dark, surface, border and text are re-derived from it so the
 * theme stays coherent, then any unreadable text is nudged back into range.
 */
export function editThemeColor(theme: ThemeRecord, role: ColorRole, hex: string): ThemeRecord {
  const next: ThemeRecord = { ...theme, colors: { ...theme.colors, [role]: hex.toUpperCase() } };
  if (role !== 'background' || isLight(hex) === isLight(theme.colors.background)) return next;

  const light = isLight(hex);
  next.colors.surface = light ? mix(hex, PAPER_ANCHOR, 0.7) : mix(hex, PAPER_ANCHOR, 0.07);
  next.colors.border = light ? mix(hex, INK_ANCHOR, 0.08) : mix(hex, PAPER_ANCHOR, 0.14);
  next.colors.text = light ? mix(hex, INK_ANCHOR, 0.9) : mix(hex, PAPER_ANCHOR, 0.9);
  // Pastel tints become deep, muted tones on dark backgrounds (and vice versa).
  next.tints = theme.tints.map((t) => (light ? mix(t, PAPER_ANCHOR, 0.75) : mix(t, hex, 0.78))) as ThemeRecord['tints'];
  return fixContrast(next);
}

/** True when two themes look the same: equal color roles and tints. */
export function sameColors(a: ThemeRecord, b: ThemeRecord): boolean {
  return (
    (Object.keys(a.colors) as ColorRole[]).every((role) => a.colors[role] === b.colors[role]) &&
    a.tints.every((tint, i) => tint === b.tints[i])
  );
}
