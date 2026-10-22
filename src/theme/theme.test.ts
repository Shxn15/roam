import { describe, expect, it } from 'vitest';
import { contrastRatio, ensureContrast, isLight, mix, normalizeHex, parseHex } from './color';
import { allReadable, checkContrast, fixContrast } from './contrast';
import { appearanceOf, deriveColorTokens, themeToCssVars } from './derive';
import { PRESETS, defaultTheme } from './presets';
import { ThemeValidationError, parseTheme } from './schema';
import type { ThemeRecord } from './types';

describe('color helpers', () => {
  it('parses short and long hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#2B3560')).toEqual({ r: 43, g: 53, b: 96 });
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(() => parseHex('rot')).toThrow();
  });

  it('mixes linearly between two colors', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // #777 on white is the classic "just below AA" grey.
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  it('nudges colors until they are readable, in either direction', () => {
    const onLight = ensureContrast('#D8D0FF', '#FFFCF7', 4.5);
    expect(contrastRatio(onLight, '#FFFCF7')).toBeGreaterThanOrEqual(4.5);
    const onDark = ensureContrast('#3A3360', '#14152B', 4.5);
    expect(contrastRatio(onDark, '#14152B')).toBeGreaterThanOrEqual(4.5);
    // Already readable colors stay as they are.
    expect(ensureContrast('#2A2734', '#FFFCF7', 4.5)).toBe('#2A2734');
  });
});

describe('presets', () => {
  it('ships five presets in the agreed order', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['standard', 'pastell-bento', 'dunkel', 'warm-dunkel', 'weiss-akzent']);
    expect(defaultTheme().id).toBe('standard');
  });

  it('never uses pure black or pure white as text', () => {
    for (const p of PRESETS) {
      expect(p.colors.text).not.toBe('#000000');
      expect(p.colors.text).not.toBe('#FFFFFF');
    }
  });

  it('uses a warm off-white (not pure white) for the standard theme', () => {
    const { background, surface } = defaultTheme().colors;
    for (const c of [background, surface]) {
      const { r, b } = parseHex(c);
      expect(c).not.toBe('#FFFFFF');
      expect(r).toBeGreaterThan(b); // warm: more red than blue
    }
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s passes every contrast check', (_name, preset) => {
    const failing = checkContrast(preset).filter((r) => !r.pass);
    expect(failing).toEqual([]);
  });

  it('detects light and dark presets from the background', () => {
    expect(PRESETS.map(appearanceOf)).toEqual(['light', 'light', 'dark', 'dark', 'light']);
  });
});

describe('token derivation', () => {
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s yields readable derived text colors', (_name, preset) => {
    const t = deriveColorTokens(preset);
    for (const bg of [t['--surface']!, t['--bg']!]) {
      expect(contrastRatio(t['--text-muted']!, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t['--accent-text']!, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(t['--on-accent']!, t['--accent']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t['--text-subtle']!, t['--surface']!)).toBeGreaterThanOrEqual(3);
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s keeps chip text readable on every tint', (_name, preset) => {
    const t = deriveColorTokens(preset);
    for (const i of [1, 2, 3, 4]) {
      expect(contrastRatio(t['--text']!, t[`--tint-${i}`]!)).toBeGreaterThanOrEqual(4.5);
      expect(t[`--tint-${i}`]).toBe(preset.tints[i - 1]); // presets need no correction
    }
  });

  it('still produces readable derived text for an unlucky custom theme', () => {
    const odd: ThemeRecord = {
      ...defaultTheme(),
      colors: { ...defaultTheme().colors, accent: '#F6E7A1', text: '#9A93A8' },
    };
    const t = deriveColorTokens(odd);
    expect(contrastRatio(t['--accent-text']!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t['--text-muted']!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('emits static, radius, motion, font and color tokens together', () => {
    const vars = themeToCssVars(defaultTheme(), 'reduced');
    expect(vars['--space-4']).toBe('16px');
    expect(vars['--radius-lg']).toBe('16px');
    expect(vars['--dur-journey']).toBe('200ms');
    expect(vars['--font-display']).toContain('Fraunces');
    expect(vars['--map-ocean']).toBe(defaultTheme().colors.background);
    expect(Object.values(vars).every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
  });

  it('keeps the map land distinguishable from the ocean', () => {
    for (const p of PRESETS) {
      const t = deriveColorTokens(p);
      expect(t['--map-land']).not.toBe(t['--map-ocean']);
      expect(isLight(t['--map-land']!)).toBe(isLight(t['--map-ocean']!));
    }
  });
});

describe('contrast check and auto-fix', () => {
  it('flags and repairs unreadable roles without touching backgrounds', () => {
    const broken: ThemeRecord = {
      ...defaultTheme(),
      colors: { ...defaultTheme().colors, text: '#D9D2C7', buttonText: '#3A4470', accent: '#F1ECE2' },
    };
    expect(allReadable(broken)).toBe(false);
    const fixed = fixContrast(broken);
    expect(allReadable(fixed)).toBe(true);
    expect(fixed.colors.background).toBe(broken.colors.background);
    expect(fixed.colors.surface).toBe(broken.colors.surface);
    expect(fixed.colors.button).toBe(broken.colors.button);
  });

  it('can fix a single check only', () => {
    const broken: ThemeRecord = {
      ...defaultTheme(),
      colors: { ...defaultTheme().colors, text: '#D9D2C7', accent: '#F1ECE2' },
    };
    const fixed = fixContrast(broken, 'text-surface');
    const results = Object.fromEntries(checkContrast(fixed).map((r) => [r.id, r.pass]));
    expect(results['text-surface']).toBe(true);
    expect(results['text-background']).toBe(true); // same role, fixed along the way
    expect(results['accent-surface']).toBe(false); // untouched
  });
});

describe('theme JSON validation', () => {
  const valid = JSON.parse(JSON.stringify(defaultTheme())) as Record<string, unknown>;

  it('round-trips a valid record', () => {
    expect(parseTheme(valid)).toEqual(defaultTheme());
  });

  it.each([
    ['wrong version', { ...valid, schemaVersion: 2 }],
    ['bad id', { ...valid, id: 'Mein Theme!' }],
    ['missing role', { ...valid, colors: { ...(valid.colors as object), accent: undefined } }],
    ['bad color', { ...valid, colors: { ...(valid.colors as object), text: 'black' } }],
    ['three tints', { ...valid, tints: ['#FFFFFF', '#FFFFFF', '#FFFFFF'] }],
    ['unknown font', { ...valid, fonts: { display: 'comic-sans', body: 'jakarta' } }],
    ['radius too big', { ...valid, radius: 80 }],
  ])('rejects %s', (_label, input) => {
    expect(() => parseTheme(input)).toThrow(ThemeValidationError);
  });
});
