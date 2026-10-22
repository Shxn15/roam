import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the rule "theme values live in one place": outside src/theme, components may only
// use CSS custom properties, never literal colors.
const SRC = join(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === join(SRC, 'theme') ? [] : sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/gi;

describe('single source of theme values', () => {
  const files = sourceFiles(SRC);

  it('scans the app sources', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no color literals outside src/theme', () => {
    const offenders = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(COLOR_LITERAL)].map((m) => `${relative(SRC, file)}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });
});
