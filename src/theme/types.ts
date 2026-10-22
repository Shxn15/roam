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
 * The world map's own colors. Land and sea differ clearly in lightness (at least 8 OKLCH
 * points) and borders stay readable (at least 3:1 against the land).
 */
export interface MapColors {
  ocean: string;
  land: string;
  border: string;
  /** Highlighted land: visited countries, and the base for hover and focus. */
  highlight: string;
}

export const MAP_COLOR_ROLES = ['ocean', 'land', 'border', 'highlight'] as const;

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
  /** Map colors. Presets define them; without them they are derived from the background. */
  map?: MapColors;
  fonts: { display: FontId; body: FontId };
  /** Base corner radius in px. */
  radius: number;
}
