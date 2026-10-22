import { describe, expect, it } from 'vitest';
import { contrastRatio, isLight } from './color';
import { allReadable } from './contrast';
import { deriveColorTokens } from './derive';
import { editThemeColor, sameColors } from './editing';
import { defaultTheme, findPreset } from './presets';

describe('editing a theme color', () => {
  it('changes only the edited role when the theme stays light', () => {
    const base = defaultTheme();
    const next = editThemeColor(base, 'accent', '#2f8577');
    expect(next.colors.accent).toBe('#2F8577');
    expect({ ...next.colors, accent: base.colors.accent }).toEqual(base.colors);
    expect(next.tints).toEqual(base.tints);
  });

  it('re-derives surface, text, border and tints when the background turns dark', () => {
    const next = editThemeColor(defaultTheme(), 'background', '#1B2233');
    expect(isLight(next.colors.surface)).toBe(false);
    expect(isLight(next.colors.text)).toBe(true);
    expect(allReadable(next)).toBe(true);
    const t = deriveColorTokens(next);
    for (const i of [1, 2, 3, 4]) {
      expect(isLight(next.tints[i - 1]!)).toBe(false);
      expect(contrastRatio(t['--text']!, t[`--tint-${i}`]!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('works the other way round, from dark to light', () => {
    const next = editThemeColor(findPreset('dunkel')!, 'background', '#F3EFE8');
    expect(isLight(next.colors.surface)).toBe(true);
    expect(isLight(next.colors.text)).toBe(false);
    expect(allReadable(next)).toBe(true);
  });

  it('compares themes by their colors', () => {
    const base = defaultTheme();
    expect(sameColors(base, { ...base, name: 'Anders' })).toBe(true);
    expect(sameColors(base, editThemeColor(base, 'border', '#D0C4B2'))).toBe(false);
    expect(sameColors(base, { ...base, tints: ['#000000', ...base.tints.slice(1)] as typeof base.tints })).toBe(false);
  });
});
