import type { FontId } from './tokens';

/** The color roles a theme defines. Everything else is derived from these. */
export const COLOR_ROLES = ['background', 'surface', 'accent', 'text', 'border', 'button', 'buttonText'] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export type ThemeColors = Record<ColorRole, string>;

export const COLOR_ROLE_LABELS: Record<ColorRole, string> = {
  background: 'Hintergrund',
  surface: 'Oberfläche',
  accent: 'Akzent',
  text: 'Text',
  border: 'Rahmen',
  button: 'Button',
  buttonText: 'Button-Text',
};

export type Appearance = 'light' | 'dark';

/**
 * A theme as stored on disk: presets ship as JSON files, custom themes are the same JSON
 * in the `themes` table. `basedOn` points to the preset a custom theme started from.
 */
export interface ThemeRecord {
  schemaVersion: 1;
  id: string;
  name: string;
  basedOn: string | null;
  colors: ThemeColors;
  /** Four soft decorative tones: trip statuses, bento cards, categories. */
  tints: [string, string, string, string];
  fonts: { display: FontId; body: FontId };
  /** Base corner radius in px. */
  radius: number;
}
