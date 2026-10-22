import type { CSSProperties } from 'react';
import { deriveColorTokens, fontTokens } from './derive';
import { radiusTokens } from './tokens';
import type { ThemeRecord } from './types';

/** Custom properties for rendering one theme inside an element (e.g. a preview card). */
export function scopedThemeStyle(theme: ThemeRecord): CSSProperties {
  return {
    ...deriveColorTokens(theme),
    ...fontTokens(theme),
    ...radiusTokens(theme.radius),
  } as CSSProperties;
}
