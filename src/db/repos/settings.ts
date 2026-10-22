import type { MotionPreference } from '../../motion/preference';
import type { Db } from '../types';

/** Every persisted setting with its type. Values are stored as JSON. */
export interface Settings {
  'theme.active': string;
  'motion.preference': MotionPreference;
}

export type SettingKey = keyof Settings;

export async function getSetting<K extends SettingKey>(db: Db, key: K): Promise<Settings[K] | undefined> {
  const rows = await db.select<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  const raw = rows[0]?.value;
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as Settings[K];
  } catch {
    return undefined;
  }
}

export async function setSetting<K extends SettingKey>(db: Db, key: K, value: Settings[K], now = new Date()): Promise<void> {
  await db.execute(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), now.toISOString()],
  );
}
