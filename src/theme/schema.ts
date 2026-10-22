import { isHexColor, normalizeHex } from './color';
import { FONT_IDS, type FontId } from './tokens';
import { COLOR_ROLES, MAP_COLOR_ROLES, type MapColors, type ThemeColors, type ThemeRecord } from './types';

export class ThemeValidationError extends Error {}

function fail(message: string): never {
  throw new ThemeValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFont(value: unknown, field: string): FontId {
  if (typeof value !== 'string' || !FONT_IDS.includes(value as FontId)) {
    fail(`Unbekannte Schrift in „${field}“: ${String(value)}`);
  }
  return value as FontId;
}

/** Validates and normalizes a theme JSON record (preset file or database row). */
export function parseTheme(input: unknown): ThemeRecord {
  if (!isRecord(input)) fail('Theme muss ein Objekt sein');
  if (input.schemaVersion !== 1) fail(`Nicht unterstützte Theme-Version: ${String(input.schemaVersion)}`);

  const { id, name, basedOn, colors, tints, fonts, radius, map } = input;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) fail(`Ungültige Theme-ID: ${String(id)}`);
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 60) fail('Theme-Name fehlt oder ist zu lang');
  if (basedOn !== null && typeof basedOn !== 'string') fail('„basedOn“ muss eine Preset-ID oder null sein');

  if (!isRecord(colors)) fail('Farbrollen fehlen');
  const parsedColors = {} as ThemeColors;
  for (const role of COLOR_ROLES) {
    const value = colors[role];
    if (!isHexColor(value)) fail(`Farbrolle „${role}“ ist keine Hex-Farbe: ${String(value)}`);
    parsedColors[role] = normalizeHex(value);
  }

  if (!Array.isArray(tints) || tints.length !== 4 || !tints.every(isHexColor)) {
    fail('„tints“ braucht genau vier Hex-Farben');
  }

  if (!isRecord(fonts)) fail('Schriften fehlen');
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0 || radius > 32) {
    fail('„radius“ muss zwischen 0 und 32 liegen');
  }

  let parsedMap: MapColors | undefined;
  if (map !== undefined) {
    if (!isRecord(map)) fail('„map“ muss ein Objekt sein');
    parsedMap = {} as MapColors;
    for (const role of MAP_COLOR_ROLES) {
      const value = map[role];
      if (!isHexColor(value)) fail(`Kartenfarbe „${role}“ ist keine Hex-Farbe: ${String(value)}`);
      parsedMap[role] = normalizeHex(value);
    }
  }

  return {
    schemaVersion: 1,
    id,
    name: name.trim(),
    basedOn: basedOn ?? null,
    colors: parsedColors,
    tints: tints.map((t: string) => normalizeHex(t)) as ThemeRecord['tints'],
    fonts: { display: parseFont(fonts.display, 'display'), body: parseFont(fonts.body, 'body') },
    radius,
    ...(parsedMap ? { map: parsedMap } : {}),
  };
}
