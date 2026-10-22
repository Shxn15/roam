import { create } from 'zustand';

export type SettingsSection = 'appearance' | 'motion' | 'data';

interface UiState {
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  openSettings(section?: SettingsSection): void;
  closeSettings(): void;
  setSettingsSection(section: SettingsSection): void;
}

export const useUi = create<UiState>((set) => ({
  settingsOpen: false,
  settingsSection: 'appearance',
  openSettings: (section) => set((s) => ({ settingsOpen: true, settingsSection: section ?? s.settingsSection })),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsSection: (section) => set({ settingsSection: section }),
}));
