import { isPresetId } from '../../theme/presets';
import { parseTheme } from '../../theme/schema';
import type { ThemeRecord } from '../../theme/types';
import type { Db } from '../types';

/** Custom themes, stored as the same JSON records the presets ship as. */
export async function listCustomThemes(db: Db): Promise<ThemeRecord[]> {
  const rows = await db.select<{ id: string; data: string }>('SELECT id, data FROM themes ORDER BY created_at, id');
  const themes: ThemeRecord[] = [];
  for (const row of rows) {
    try {
      themes.push(parseTheme(JSON.parse(row.data)));
    } catch (error) {
      console.warn(`Theme „${row.id}“ ist beschädigt und wird übersprungen`, error);
    }
  }
  return themes;
}

export async function saveCustomTheme(db: Db, theme: ThemeRecord, now = new Date()): Promise<ThemeRecord> {
  const record = parseTheme(theme);
  if (isPresetId(record.id)) throw new Error('Presets sind schreibgeschützt. Speichere Änderungen als eigenes Theme.');
  const ts = now.toISOString();
  await db.execute(
    `INSERT INTO themes (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`,
    [record.id, record.name, JSON.stringify(record), ts, ts],
  );
  return record;
}

export async function deleteCustomTheme(db: Db, id: string): Promise<void> {
  await db.execute('DELETE FROM themes WHERE id = ?', [id]);
}
