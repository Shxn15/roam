import { create } from 'zustand';

export type SettingsSection = 'appearance' | 'motion' | 'data';

interface UiState {
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  /** "Neue Reise" on the home screen: the next country opened starts with the new-trip dialog. */
  newTripIntent: boolean;
  openSettings(section?: SettingsSection): void;
  closeSettings(): void;
  setSettingsSection(section: SettingsSection): void;
  setNewTripIntent(intent: boolean): void;
}

export const useUi = create<UiState>((set) => ({
  settingsOpen: false,
  settingsSection: 'appearance',
  newTripIntent: false,
  openSettings: (section) => set((s) => ({ settingsOpen: true, settingsSection: section ?? s.settingsSection })),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsSection: (section) => set({ settingsSection: section }),
  setNewTripIntent: (intent) => set({ newTripIntent: intent }),
}));
