import type { Insets } from '../features/map/camera';

/**
 * Space the floating panels take on the home screen, so the world map is
 * centered in the free area rather than hidden behind them.
 */
export const HOME_MAP_INSETS: Insets = { top: 64, right: 88, bottom: 168, left: 332 };

/** The country page: a wide floating panel on the left; the map keeps a strip on the right. */
export const COUNTRY_PANEL = { min: 720, max: 1080, mapStrip: 420, gap: 16 } as const;

export function countryPanelWidth(viewportWidth: number): number {
  return Math.round(Math.min(COUNTRY_PANEL.max, Math.max(COUNTRY_PANEL.min, viewportWidth - COUNTRY_PANEL.mapStrip)));
}

/** Where the map frames the country beside the country page. */
export function countryMapInsets(viewportWidth: number): Insets {
  return { top: 64, right: 32, bottom: 48, left: countryPanelWidth(viewportWidth) + 2 * COUNTRY_PANEL.gap + 8 };
}
