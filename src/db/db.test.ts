import { describe, expect, it } from 'vitest';
import { createCustomTheme, newCustomThemeId, resetBase, slugify } from '../theme/custom';
import { defaultTheme, findPreset } from '../theme/presets';
import { resolveMotion } from '../motion/preference';
import { MIGRATIONS, migrate, schemaVersion, type Migration } from './migrations';
import { getSetting, setSetting } from './repos/settings';
import { deleteCustomTheme, listCustomThemes, saveCustomTheme } from './repos/themes';
import { createTestDb } from './testing';

describe('migrations', () => {
  it('migrates a fresh database to the latest schema', async () => {
    const db = await createTestDb({ migrated: false });
    expect(await schemaVersion(db)).toBe(0);
    const result = await migrate(db);
    expect(result).toEqual({ from: 0, to: MIGRATIONS.length });
    const tables = await db.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(['countries', 'days', 'settings', 'themes', 'time_blocks', 'trips']);
  });

  it('is idempotent', async () => {
    const db = await createTestDb();
    expect(await migrate(db)).toEqual({ from: MIGRATIONS.length, to: MIGRATIONS.length });
  });

  it('rolls back a failing migration completely', async () => {
    const db = await createTestDb({ migrated: false });
    const broken: Migration[] = [
      ...MIGRATIONS,
      { version: MIGRATIONS.length + 1, name: 'kaputt', sql: 'CREATE TABLE half (id TEXT); INSERT INTO nope VALUES (1);' },
    ];
    await expect(migrate(db, broken)).rejects.toThrow(/kaputt/);
    expect(await schemaVersion(db)).toBe(MIGRATIONS.length);
    const half = await db.select("SELECT name FROM sqlite_master WHERE name = 'half'");
    expect(half).toEqual([]);
  });

  it('refuses databases from a newer app version', async () => {
    const db = await createTestDb();
    await db.executeScript('PRAGMA user_version = 99;');
    await expect(migrate(db)).rejects.toThrow(/neueren Roam-Version/);
  });

  it('requires gapless migration numbers', async () => {
    const db = await createTestDb({ migrated: false });
    await expect(migrate(db, [{ version: 2, name: 'x', sql: '' }])).rejects.toThrow(/lückenlos/);
  });
});

describe('settings', () => {
  it('stores typed JSON values and overwrites them', async () => {
    const db = await createTestDb();
    expect(await getSetting(db, 'theme.active')).toBeUndefined();
    await setSetting(db, 'theme.active', 'dunkel');
    await setSetting(db, 'motion.preference', 'reduced');
    await setSetting(db, 'theme.active', 'pastell-bento');
    expect(await getSetting(db, 'theme.active')).toBe('pastell-bento');
    expect(await getSetting(db, 'motion.preference')).toBe('reduced');
  });
});

describe('motion preference', () => {
  it('follows the system unless overridden', () => {
    expect(resolveMotion('system', true)).toBe('reduced');
    expect(resolveMotion('system', false)).toBe('full');
    expect(resolveMotion('full', true)).toBe('full');
    expect(resolveMotion('reduced', false)).toBe('reduced');
  });
});

describe('custom themes', () => {
  it('builds ids from German names', () => {
    expect(slugify('Herbst in Kyōto – Grün & Gold')).toBe('herbst-in-kyoto-gruen-gold');
    expect(newCustomThemeId('Mein Theme', () => 0)).toBe('mein-theme-00000');
    expect(newCustomThemeId('!!!', () => 0)).toBe('theme-00000');
  });

  it('saves, lists, updates and deletes custom themes as JSON records', async () => {
    const db = await createTestDb();
    const base = findPreset('dunkel')!;
    const mine = createCustomTheme(base, { ...base.colors, accent: '#7FD1B9' }, 'Nachtgrün');
    expect(mine.basedOn).toBe('dunkel');

    await saveCustomTheme(db, mine, new Date('2026-10-01T10:00:00Z'));
    await saveCustomTheme(db, { ...mine, name: 'Nachtgrün 2' }, new Date('2026-10-02T10:00:00Z'));
    const listed = await listCustomThemes(db);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: mine.id, name: 'Nachtgrün 2', colors: { accent: '#7FD1B9' } });

    const [row] = await db.select<{ created_at: string; updated_at: string }>('SELECT created_at, updated_at FROM themes');
    expect(row).toEqual({ created_at: '2026-10-01T10:00:00.000Z', updated_at: '2026-10-02T10:00:00.000Z' });

    await deleteCustomTheme(db, mine.id);
    expect(await listCustomThemes(db)).toEqual([]);
  });

  it('never overwrites a preset', async () => {
    const db = await createTestDb();
    await expect(saveCustomTheme(db, defaultTheme())).rejects.toThrow(/schreibgeschützt/);
  });

  it('skips damaged rows instead of failing', async () => {
    const db = await createTestDb();
    const ts = new Date().toISOString();
    await db.execute('INSERT INTO themes (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      'kaputt',
      'Kaputt',
      JSON.stringify({ schemaVersion: 1, id: 'kaputt' }),
      ts,
      ts,
    ]);
    const original = console.warn;
    console.warn = () => undefined;
    try {
      expect(await listCustomThemes(db)).toEqual([]);
    } finally {
      console.warn = original;
    }
  });

  it('resets to the preset a custom theme came from', () => {
    const base = findPreset('warm-dunkel')!;
    const mine = createCustomTheme(base, { ...base.colors, accent: '#C9A227' }, 'Messing');
    expect(resetBase(mine).id).toBe('warm-dunkel');
    expect(resetBase(base).id).toBe('warm-dunkel');
  });
});
