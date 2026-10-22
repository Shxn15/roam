import { useMemo } from 'react';
import { MOTION } from '../theme/tokens';
import { motionLevel, useThemeStore } from '../theme/themeStore';

export function useMotionLevel() {
  return useThemeStore(motionLevel);
}

/** Durations in seconds for Motion animations, already adjusted for "Bewegung reduzieren". */
export function useDurations() {
  const level = useMotionLevel();
  return useMemo(() => {
    const d = MOTION[level];
    return { fast: d.fast / 1000, base: d.base / 1000, slow: d.slow / 1000, journey: d.journey / 1000, reduced: level === 'reduced' };
  }, [level]);
}

/** Motion wants cubic-bezier easings as arrays. */
export const EASE_SOFT = [0.22, 0.8, 0.24, 1] as const;
