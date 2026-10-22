import { create } from 'zustand';
import { getDb } from '../db/instance';
import { getSetting, setSetting } from '../db/repos/settings';
import { deleteCustomTheme, listCustomThemes, saveCustomTheme } from '../db/repos/themes';
import { isMotionPreference, resolveMotion, type MotionPreference } from '../motion/preference';
import { reportError } from '../ui/toast';
import { applyTheme, applyThemeSmoothly, cacheTheme } from './applyTheme';
import { createCustomTheme, resetBase } from './custom';
import { editThemeColor, sameColors } from './editing';
import { DEFAULT_THEME_ID, PRESETS, defaultTheme, isPresetId } from './presets';
import type { MotionLevel } from './tokens';
import type { ColorRole, ThemeRecord } from './types';

export interface ThemeState {
  custom: ThemeRecord[];
  activeId: string;
  /** Unsaved edits of the active theme. Applied live, persisted only on save. */
  draft: ThemeRecord | null;
  motionPreference: MotionPreference;
  systemReducedMotion: boolean;

  hydrate(): Promise<void>;
  select(id: string): void;
  editColor(role: ColorRole, hex: string): void;
  replaceDraft(theme: ThemeRecord): void;
  resetToPreset(): void;
  discardDraft(): void;
  saveDraftAsNew(name: string): Promise<ThemeRecord>;
  saveDraftInPlace(): Promise<void>;
  deleteCustom(id: string): Promise<void>;
  setMotionPreference(preference: MotionPreference): void;
  setSystemReducedMotion(reduced: boolean): void;
}

type ThemeData = Pick<ThemeState, 'custom' | 'activeId' | 'draft' | 'motionPreference' | 'systemReducedMotion'>;

export const allThemes = (s: ThemeData): ThemeRecord[] => [...PRESETS, ...s.custom];
export const activeTheme = (s: ThemeData): ThemeRecord => allThemes(s).find((t) => t.id === s.activeId) ?? defaultTheme();
export const effectiveTheme = (s: ThemeData): ThemeRecord => s.draft ?? activeTheme(s);
export const motionLevel = (s: ThemeData): MotionLevel => resolveMotion(s.motionPreference, s.systemReducedMotion);
export const isDirty = (s: ThemeData): boolean => s.draft !== null && !sameColors(s.draft, activeTheme(s));

export const useThemeStore = create<ThemeState>((set, get) => ({
  custom: [],
  activeId: DEFAULT_THEME_ID,
  draft: null,
  motionPreference: 'system',
  systemReducedMotion: false,

  async hydrate() {
    const db = getDb();
    const [custom, storedId, storedMotion] = await Promise.all([
      listCustomThemes(db),
      getSetting(db, 'theme.active'),
      getSetting(db, 'motion.preference'),
    ]);
    const known = [...PRESETS, ...custom].some((t) => t.id === storedId);
    set({
      custom,
      activeId: known && storedId ? storedId : DEFAULT_THEME_ID,
      motionPreference: isMotionPreference(storedMotion) ? storedMotion : 'system',
    });
  },

  select(id) {
    if (!allThemes(get()).some((t) => t.id === id)) return;
    set({ activeId: id, draft: null });
    void setSetting(getDb(), 'theme.active', id).catch(reportError('Theme konnte nicht gespeichert werden'));
  },

  editColor(role, hex) {
    set({ draft: editThemeColor(effectiveTheme(get()), role, hex) });
  },

  replaceDraft(theme) {
    set({ draft: theme });
  },

  resetToPreset() {
    const current = effectiveTheme(get());
    const base = resetBase(current);
    set({ draft: { ...current, colors: { ...base.colors }, tints: [...base.tints] } });
  },

  discardDraft() {
    set({ draft: null });
  },

  async saveDraftAsNew(name) {
    const source = effectiveTheme(get());
    const theme = await saveCustomTheme(getDb(), createCustomTheme(source, source.colors, name));
    set({ custom: [...get().custom, theme], activeId: theme.id, draft: null });
    await setSetting(getDb(), 'theme.active', theme.id);
    return theme;
  },

  async saveDraftInPlace() {
    const { draft } = get();
    if (!draft || isPresetId(draft.id)) return;
    const saved = await saveCustomTheme(getDb(), draft);
    set({ custom: get().custom.map((t) => (t.id === saved.id ? saved : t)), draft: null });
  },

  async deleteCustom(id) {
    await deleteCustomTheme(getDb(), id);
    const s = get();
    const removed = s.custom.find((t) => t.id === id);
    const custom = s.custom.filter((t) => t.id !== id);
    if (s.activeId !== id) {
      set({ custom });
      return;
    }
    const fallback = resetBase(removed ?? defaultTheme()).id;
    set({ custom, activeId: fallback, draft: null });
    await setSetting(getDb(), 'theme.active', fallback);
  },

  setMotionPreference(preference) {
    set({ motionPreference: preference });
    void setSetting(getDb(), 'motion.preference', preference).catch(
      reportError('Einstellung konnte nicht gespeichert werden'),
    );
  },

  setSystemReducedMotion(reduced) {
    set({ systemReducedMotion: reduced });
  },
}));

/** Keeps <html>'s custom properties in sync with the store. Call once at startup. */
export function startThemeSync(): () => void {
  return useThemeStore.subscribe((s, prev) => {
    const theme = effectiveTheme(s);
    const before = effectiveTheme(prev);
    const motion = motionLevel(s);
    if (theme !== before || motion !== motionLevel(prev)) {
      // Picking another theme cross-fades; editing colors updates instantly.
      if (theme.id !== before.id) applyThemeSmoothly(theme, motion);
      else applyTheme(theme, motion);
    }
    if (s.activeId !== prev.activeId || s.custom !== prev.custom) cacheTheme(activeTheme(s));
  });
}
