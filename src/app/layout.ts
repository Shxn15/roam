import type { Insets } from '../features/map/camera';

/**
 * Space the floating panels take on the home screen, so the world map is
 * centered in the free area rather than hidden behind them.
 */
export const HOME_MAP_INSETS: Insets = { top: 64, right: 88, bottom: 168, left: 332 };

/** On the country page a wider panel sits on the left and the trip dock is gone. */
export const COUNTRY_MAP_INSETS: Insets = { top: 64, right: 88, bottom: 48, left: 456 };
