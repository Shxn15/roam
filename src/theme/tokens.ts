// The one place for all non-color design values. Color values live in the theme
// presets (./presets/*.json); the rules that turn them into tokens live in ./derive.ts.
// Components only ever read CSS custom properties (var(--…)).

export const FONTS = {
  fraunces: {
    label: 'Fraunces',
    stack: "'Fraunces Variable', 'Iowan Old Style', Georgia, serif",
    // Soft, rounded terminals: cozier than the default cut.
    variation: '"SOFT" 100, "WONK" 0, "opsz" 48',
  },
  bricolage: {
    label: 'Bricolage Grotesque',
    stack: "'Bricolage Grotesque Variable', 'Avenir Next', system-ui, sans-serif",
    variation: 'normal',
  },
  jakarta: {
    label: 'Plus Jakarta Sans',
    stack: "'Plus Jakarta Sans Variable', 'Segoe UI', system-ui, sans-serif",
    variation: 'normal',
  },
  fredoka: {
    label: 'Fredoka',
    stack: "'Fredoka Variable', 'Arial Rounded MT Bold', system-ui, sans-serif",
    variation: 'normal',
  },
} as const;

export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as FontId[];

/** Static scales, written to :root as CSS custom properties together with the colors. */
export const STATIC_TOKENS: Record<string, string> = {
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-7': '32px',
  '--space-8': '48px',

  '--text-xs': '12px',
  '--text-sm': '13px',
  '--text-md': '14px',
  '--text-base': '15px',
  '--text-lg': '17px',
  '--text-xl': '20px',
  '--text-2xl': '26px',
  '--text-3xl': '34px',
  '--leading-tight': '1.2',
  '--leading-normal': '1.5',

  '--panel-gap': '16px',
  '--panel-width': '300px',
  '--dock-height': '128px',

  '--z-map': '0',
  '--z-panels': '10',
  '--z-overlay': '50',
  '--z-modal': '100',
};

/** Corner radii are derived from the theme's base radius so presets can feel rounder or crisper. */
export function radiusTokens(base: number): Record<string, string> {
  const r = (factor: number) => `${Math.round(base * factor)}px`;
  return {
    '--radius-xs': r(0.375),
    '--radius-sm': r(0.625),
    '--radius-md': r(0.875),
    '--radius-lg': r(1),
    '--radius-xl': r(1.5),
    // Floating map panels stay close to 24 px in every preset.
    '--radius-panel': `${Math.min(28, Math.max(20, Math.round(base * 1.5)))}px`,
    '--radius-pill': '999px',
  };
}

/**
 * Motion. Big transitions (map flights, zooms) are calm and take 1.5–2 s; UI feedback stays quick.
 * With reduced motion, movement is replaced by short fades.
 */
export const MOTION = {
  full: { fast: 140, base: 240, slow: 480, journey: 1800 },
  reduced: { fast: 0, base: 0, slow: 120, journey: 200 },
  ease: {
    soft: 'cubic-bezier(0.22, 0.8, 0.24, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
} as const;

export type MotionLevel = keyof Omit<typeof MOTION, 'ease'>;

export function motionTokens(level: MotionLevel): Record<string, string> {
  const d = MOTION[level];
  return {
    '--dur-fast': `${d.fast}ms`,
    '--dur-base': `${d.base}ms`,
    '--dur-slow': `${d.slow}ms`,
    '--dur-journey': `${d.journey}ms`,
    '--ease-soft': MOTION.ease.soft,
    '--ease-in-out': MOTION.ease.inOut,
  };
}

/** Semantic status colors are not user-editable; they only follow light/dark. */
export const STATUS_COLORS = {
  light: { danger: '#B8433A', warning: '#9A6A12', success: '#2F7A55' },
  dark: { danger: '#FF9B8F', warning: '#F2C46D', success: '#86D9AC' },
} as const;

/** Brand colors stay fixed across themes: no orange, no pure black (see README, Branding). */
export const BRAND = {
  nightBlue: '#1F2A5C',
  periwinkle: '#5165D3',
  lavender: '#CFC6FF',
  cream: '#FFF8EC',
} as const;

/** How strongly derived tones lean on their sources, per appearance. */
export const DERIVE = {
  light: { accentSoft: 0.14, landFromSurface: 0.7, landLift: 0, graticule: 0.6, visited: 0.42, shadowAlpha: 0.1, sunken: 0.55 },
  dark: { accentSoft: 0.24, landFromSurface: 1, landLift: 0.05, graticule: 0.4, visited: 0.5, shadowAlpha: 0.42, sunken: 0.6 },
} as const;
