// Small, dependency-free color helpers (sRGB hex in, hex out) used for token
// derivation and the WCAG contrast check.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function parseHex(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Ungültige Farbe: ${String(hex)}`);
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function normalizeHex(hex: string): string {
  return toHex(parseHex(hex));
}

/** Linear blend in sRGB: amount 0 returns `a`, amount 1 returns `b`. */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  const t = Math.min(1, Math.max(0, amount));
  return toHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/** "r g b" triplet for use as `rgb(var(--x) / 0.2)`. */
export function rgbTriplet(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

function channelToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG 2.x contrast ratio between 1 and 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isLight(hex: string): boolean {
  // Mid-point where black and white text have equal contrast.
  return relativeLuminance(hex) > 0.179;
}

// Anchors for darkening/lightening. Deliberately not pure black: Roam never uses #000.
export const INK_ANCHOR = '#121019';
export const PAPER_ANCHOR = '#FFFFFF';

/**
 * Returns `fg`, nudged toward the anchor that contrasts most with `bg`, so that the
 * contrast ratio reaches `min`. Keeps as much of the original hue as possible by
 * taking the smallest step that passes. If even the anchor fails, the anchor is returned.
 */
export function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrastRatio(fg, bg) >= min) return normalizeHex(fg);
  const anchor = contrastRatio(INK_ANCHOR, bg) >= contrastRatio(PAPER_ANCHOR, bg) ? INK_ANCHOR : PAPER_ANCHOR;
  const steps = 200;
  for (let i = 1; i <= steps; i++) {
    const candidate = mix(fg, anchor, i / steps);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return anchor;
}

// ── OKLab / OKLCH (Björn Ottosson), for perceptual lightness ─────────────────────────────

export interface Oklch {
  /** Perceived lightness 0..1 (multiply by 100 for "points"). */
  l: number;
  c: number;
  /** Hue in degrees. */
  h: number;
}

export function toOklab(hex: string): { l: number; a: number; b: number } {
  const { r, g, b } = parseHex(hex);
  const lr = channelToLinear(r);
  const lg = channelToLinear(g);
  const lb = channelToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function toOklch(hex: string): Oklch {
  const { l, a, b } = toOklab(hex);
  return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

function linearToChannel(v: number): number {
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return s * 255;
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

/** OKLCH to hex. Colors outside sRGB keep lightness and hue and lose chroma until they fit. */
export function fromOklch(color: Oklch): string {
  const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let lo = 0;
  let hi = color.c;
  let rgb = oklchToLinear(color);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear({ ...color, c: lo });
  }
  const [r, g, b] = rgb.map((v) => linearToChannel(Math.min(1, Math.max(0, v))));
  return toHex({ r: r!, g: g!, b: b! });
}

/** Perceived lightness in points (0–100), as OKLCH reports it. */
export function lightnessPoints(hex: string): number {
  return toOklch(hex).l * 100;
}

/** Picks the candidate with the highest contrast against `bg`. */
export function mostReadable(bg: string, candidates: string[]): string {
  let best = candidates[0] ?? INK_ANCHOR;
  let bestRatio = -1;
  for (const c of candidates) {
    const ratio = contrastRatio(c, bg);
    if (ratio > bestRatio) {
      best = c;
      bestRatio = ratio;
    }
  }
  return normalizeHex(best);
}
