import { describe, expect, it } from 'vitest';
import { atlasCountry } from '../geo/atlas';
import { themeStylesheet } from './applyTheme';
import { contrastRatio, toOklch } from './color';
import { COUNTRY_THEMES, PATTERN_OPACITY, countryTheme, countryTokens } from './countryTheme';
import { PATTERNS } from './patterns';
import { PRESETS } from './presets';

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('country themes', () => {
  it('starts with Japan (Seigaiha in red) and Italy, for countries that exist', () => {
    expect(countryTheme('JPN')).toMatchObject({ pattern: 'seigaiha' });
    expect(toOklch(countryTheme('JPN')!.accent).h).toBeLessThan(40); // red
    expect(countryTheme('ITA')).toBeDefined();
    for (const c of COUNTRY_THEMES) {
      expect(atlasCountry(c.id), c.id).toBeDefined();
      expect(PATTERNS[c.pattern].markup).toContain('class="line"');
    }
    expect(countryTheme('DEU')).toBeUndefined(); // others use the app accent
  });

  it('keeps the header pattern between 3 and 6 % opacity', () => {
    for (const value of Object.values(PATTERN_OPACITY)) {
      expect(value).toBeGreaterThanOrEqual(0.03);
      expect(value).toBeLessThanOrEqual(0.06);
    }
  });

  it('stays readable and keeps its hue on every preset', () => {
    for (const theme of PRESETS) {
      const { surface, background } = theme.colors;
      for (const country of COUNTRY_THEMES) {
        const t = countryTokens(country, theme);
        const label = `${country.id} on ${theme.id}`;
        expect(contrastRatio(t['--country-accent-text']!, surface), label).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t['--country-accent-text']!, background), label).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t['--country-accent']!, surface), label).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(t['--country-on-accent']!, t['--country-accent']!), label).toBeGreaterThanOrEqual(3);
        expect(hueDistance(toOklch(t['--country-accent']!).h, toOklch(country.accent).h), label).toBeLessThan(15);
        const opacity = Number(t['--country-pattern-opacity']);
        expect(opacity).toBeGreaterThanOrEqual(0.03);
        expect(opacity).toBeLessThanOrEqual(0.06);
      }
    }
  });

  it('is part of the theme stylesheet, so a switch recolors it in the same update', () => {
    const css = themeStylesheet(PRESETS[0]!, 'full');
    expect(css.startsWith(':root{')).toBe(true);
    expect(css).toContain('[data-country-theme]{--country-accent:var(--accent)');
    expect(css).toContain('[data-country-theme="JPN"]{--country-accent:#');
    expect(css).toContain('[data-country-theme="ITA"]{');
  });
});
