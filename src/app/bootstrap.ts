import { useTravelStore } from '../data/travelStore';
import { openDatabase } from '../db';
import { setDb } from '../db/instance';
import { systemPrefersReducedMotion, watchSystemReducedMotion } from '../motion/systemMotion';
import { applyTheme, cacheTheme } from '../theme/applyTheme';
import { activeTheme, effectiveTheme, motionLevel, startThemeSync, useThemeStore } from '../theme/themeStore';

let booting: Promise<void> | null = null;

/** Opens and migrates the database, then loads themes and settings. Runs once. */
export function bootstrap(): Promise<void> {
  booting ??= (async () => {
    useThemeStore.getState().setSystemReducedMotion(systemPrefersReducedMotion());
    watchSystemReducedMotion((reduced) => useThemeStore.getState().setSystemReducedMotion(reduced));
    startThemeSync();
    setDb(await openDatabase());
    await Promise.all([useThemeStore.getState().hydrate(), useTravelStore.getState().load()]);
    // The database is the source of truth: repaint even if the quick-start cache disagreed.
    const state = useThemeStore.getState();
    applyTheme(effectiveTheme(state), motionLevel(state));
    cacheTheme(activeTheme(state));
  })();
  return booting;
}
