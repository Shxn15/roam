// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { setDb } from '../db/instance';
import { getSetting } from '../db/repos/settings';
import { createTestDb } from '../db/testing';
import { findPreset } from './presets';
import { startThemeSync, useThemeStore } from './themeStore';

/** The custom properties currently set by the theme stylesheet's :root rule. */
function themeVars(): Map<string, string> {
  const text = document.getElementById('roam-theme')?.textContent ?? '';
  return new Map(
    (/^:root\{([^}]*)\}/.exec(text)?.[1] ?? '')
      .split(';')
      .map((decl) => [decl.slice(0, decl.indexOf(':')), decl.slice(decl.indexOf(':') + 1)] as [string, string]),
  );
}

describe('switching the theme', () => {
  it('changes the token values in one stylesheet and remembers the choice', async () => {
    const db = await createTestDb();
    setDb(db);
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [], motionPreference: 'full' });
    const stop = startThemeSync();

    useThemeStore.getState().select('dunkel');
    const dunkel = findPreset('dunkel')!;
    let vars = themeVars();
    expect(vars.get('--bg')).toBe(dunkel.colors.background);
    expect(vars.get('--accent')).toBe(dunkel.colors.accent);
    expect(vars.get('--map-land')).toBe(dunkel.map!.land);
    expect(vars.get('--map-ocean')).toBe(dunkel.map!.ocean);
    expect(vars.get('--font-display')).toContain('Fraunces');
    expect(document.documentElement.dataset.appearance).toBe('dark');

    useThemeStore.getState().select('pastell-bento');
    const bento = findPreset('pastell-bento')!;
    vars = themeVars();
    expect(vars.get('--bg')).toBe(bento.colors.background);
    expect(vars.get('--tint-2')).toBe(bento.tints[1]);
    expect(vars.get('--map-highlight')).toBe(bento.map!.highlight);
    expect(vars.get('--font-display')).toContain('Bricolage');
    expect(document.documentElement.dataset.appearance).toBe('light');

    // One stylesheet, rewritten in place: a single update per switch.
    expect(document.querySelectorAll('#roam-theme')).toHaveLength(1);
    await vi.waitFor(async () => expect(await getSetting(db, 'theme.active')).toBe('pastell-bento'));
    stop();
  });

  it('turns transitions off for the frame of the switch only', async () => {
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [], motionPreference: 'full' });
    const stop = startThemeSync();
    useThemeStore.getState().select('weiss-akzent');
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true);
    await vi.waitFor(() => expect(document.documentElement.classList.contains('theme-switching')).toBe(false));
    stop();
  });

  it('ignores unknown theme ids', () => {
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [] });
    useThemeStore.getState().select('gibt-es-nicht');
    expect(useThemeStore.getState().activeId).toBe('standard');
  });
});
