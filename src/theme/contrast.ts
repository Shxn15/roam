import { contrastRatio, ensureContrast } from './color';
import type { ColorRole, ThemeRecord } from './types';

/** WCAG AA: 4.5:1 for body text, 3:1 for UI parts such as active indicators and focus rings. */
export const MIN_TEXT = 4.5;
export const MIN_UI = 3;

interface CheckDefinition {
  id: string;
  label: string;
  fg: ColorRole;
  bg: ColorRole;
  min: number;
}

export const CONTRAST_CHECKS: readonly CheckDefinition[] = [
  { id: 'text-background', label: 'Text auf Hintergrund', fg: 'text', bg: 'background', min: MIN_TEXT },
  { id: 'text-surface', label: 'Text auf Oberfläche', fg: 'text', bg: 'surface', min: MIN_TEXT },
  { id: 'button-text', label: 'Button-Text auf Button', fg: 'buttonText', bg: 'button', min: MIN_TEXT },
  { id: 'accent-surface', label: 'Akzent auf Oberfläche', fg: 'accent', bg: 'surface', min: MIN_UI },
];

export interface ContrastResult extends CheckDefinition {
  ratio: number;
  pass: boolean;
}

export function checkContrast(theme: ThemeRecord): ContrastResult[] {
  return CONTRAST_CHECKS.map((check) => {
    const ratio = contrastRatio(theme.colors[check.fg], theme.colors[check.bg]);
    return { ...check, ratio, pass: ratio >= check.min };
  });
}

export function allReadable(theme: ThemeRecord): boolean {
  return checkContrast(theme).every((r) => r.pass);
}

/**
 * Nudges the foreground role of every failing check (or only the role of `onlyCheckId`)
 * until it passes. Backgrounds are never touched: they carry the mood of a theme.
 */
export function fixContrast(theme: ThemeRecord, onlyCheckId?: string): ThemeRecord {
  const colors = { ...theme.colors };
  const only = CONTRAST_CHECKS.find((c) => c.id === onlyCheckId);
  const checks = only ? CONTRAST_CHECKS.filter((c) => c.fg === only.fg) : CONTRAST_CHECKS;
  // A role can appear in several checks (text on background and on surface), so repeat until stable.
  for (let round = 0; round < 3; round++) {
    let changed = false;
    for (const check of checks) {
      if (contrastRatio(colors[check.fg], colors[check.bg]) >= check.min) continue;
      colors[check.fg] = ensureContrast(colors[check.fg], colors[check.bg], check.min);
      changed = true;
    }
    if (!changed) break;
  }
  return { ...theme, colors };
}
