import type { MotionLevel } from '../theme/tokens';

/** "system" follows the OS setting "Bewegung reduzieren"; the other two override it. */
export type MotionPreference = 'system' | 'reduced' | 'full';

export function isMotionPreference(value: unknown): value is MotionPreference {
  return value === 'system' || value === 'reduced' || value === 'full';
}

export function resolveMotion(preference: MotionPreference, systemPrefersReduced: boolean): MotionLevel {
  if (preference === 'system') return systemPrefersReduced ? 'reduced' : 'full';
  return preference;
}
