/**
 * Header patterns of the country themes as SVG pattern tiles. Shapes carry one of two roles:
 * "ground" fills cover what lies behind them (in the header's own color) and "line" strokes
 * draw the motif (in the country's accent). The colors come from CSS custom properties; the
 * header shows the whole pattern at 3–6 % opacity.
 */
export interface PatternTile {
  width: number;
  height: number;
  /** SVG markup inside <pattern>, using only class="ground" and class="line". */
  markup: string;
}

const n = (v: number) => Number(v.toFixed(2));

/**
 * Seigaiha (青海波), "waves of the blue sea": rows of concentric half circles, each row in
 * front of the one above it. Drawn back to front, so every group covers the lines behind it.
 */
function seigaiha(radius = 22, rings = 4, line = 1.5): PatternTile {
  const r = radius;
  const centers: [number, number][] = [
    [r, -r / 2],
    [0, 0],
    [2 * r, 0],
    [r, r / 2],
    [0, r],
    [2 * r, r],
    [r, (3 * r) / 2],
  ];
  const markup = centers
    .map(([cx, cy]) => {
      const ground = `<circle class="ground" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
      const lines = Array.from({ length: rings }, (_, i) => {
        const ring = r * (1 - i / rings) - line / 2;
        return `<circle class="line" cx="${n(cx)}" cy="${n(cy)}" r="${n(ring)}"/>`;
      }).join('');
      return ground + lines;
    })
    .join('');
  return { width: 2 * r, height: r, markup };
}

/**
 * Majolika: a glazed tile with a four-petal rosette inside a diamond, the corners of four
 * tiles meeting in a circle, as on the floors and walls of Amalfi and Sicily.
 */
function maiolica(size = 40): PatternTile {
  const s = size;
  const h = s / 2;
  const petal = s / 5.5;
  const corner = s / 6;
  const rosette = [
    [h - petal, h],
    [h + petal, h],
    [h, h - petal],
    [h, h + petal],
  ]
    .map(([cx, cy]) => `<circle class="line" cx="${n(cx!)}" cy="${n(cy!)}" r="${n(petal)}"/>`)
    .join('');
  const corners = [
    [0, 0],
    [s, 0],
    [0, s],
    [s, s],
  ]
    .map(([cx, cy]) => `<circle class="line" cx="${cx}" cy="${cy}" r="${n(corner)}"/>`)
    .join('');
  const diamond = `<path class="line" d="M${h} ${n(corner)}L${n(s - corner)} ${h}L${h} ${n(s - corner)}L${n(corner)} ${h}Z"/>`;
  return { width: s, height: s, markup: diamond + rosette + corners };
}

export const PATTERNS = {
  seigaiha: seigaiha(),
  maiolica: maiolica(),
} as const satisfies Record<string, PatternTile>;

export type PatternId = keyof typeof PATTERNS;

export function isPatternId(value: unknown): value is PatternId {
  return typeof value === 'string' && Object.hasOwn(PATTERNS, value);
}
