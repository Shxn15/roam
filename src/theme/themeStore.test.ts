import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDb } from '../db/instance';
import { getSetting } from '../db/repos/settings';
import { createTestDb } from '../db/testing';
import { findPreset } from './presets';
import { startThemeSync, useThemeStore } from './themeStore';

/** Just enough of <html> for applyTheme: custom properties, data attributes, classes. */
function fakeRoot() {
  const props = new Map<string, string>();
  const classes = new Set<string>();
  return {
    props,
    dataset: {} as Record<string, string>,
    style: { setProperty: (name: string, value: string) => props.set(name, value), colorScheme: '' },
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
  };
}

describe('switching the theme', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('changes the applied token values and remembers the choice', async () => {
    const db = await createTestDb();
    setDb(db);
    const root = fakeRoot();
    vi.stubGlobal('document', { documentElement: root });
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [], motionPreference: 'full' });
    const stop = startThemeSync();

    useThemeStore.getState().select('dunkel');
    const dunkel = findPreset('dunkel')!;
    expect(root.props.get('--bg')).toBe(dunkel.colors.background);
    expect(root.props.get('--accent')).toBe(dunkel.colors.accent);
    expect(root.props.get('--font-display')).toContain('Fraunces');
    expect(root.dataset.appearance).toBe('dark');

    useThemeStore.getState().select('pastell-bento');
    const bento = findPreset('pastell-bento')!;
    expect(root.props.get('--bg')).toBe(bento.colors.background);
    expect(root.props.get('--tint-2')).toBe(bento.tints[1]);
    expect(root.props.get('--font-display')).toContain('Bricolage');
    expect(root.dataset.appearance).toBe('light');

    await vi.waitFor(async () => expect(await getSetting(db, 'theme.active')).toBe('pastell-bento'));
    stop();
  });

  it('ignores unknown theme ids', () => {
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [] });
    useThemeStore.getState().select('gibt-es-nicht');
    expect(useThemeStore.getState().activeId).toBe('standard');
  });
});
