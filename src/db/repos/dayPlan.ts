import {
  findOverlaps,
  generateDays,
  sortTimeBlocks,
  validateTimeBlock,
  type Day,
  type TimeBlock,
  type TimeBlockCategory,
  type TimeBlockInput,
} from '../../domain/dayPlan';
import type { Db, SqlValue } from '../types';

interface DayRow {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
}

interface TimeBlockRow {
  id: string;
  day_id: string;
  start_time: string;
  end_time: string | null;
  title: string;
  location: string;
  note: string;
  category: TimeBlockCategory;
}

const toDay = (r: DayRow): Day => ({ id: r.id, tripId: r.trip_id, dayNumber: r.day_number, date: r.date });

const toBlock = (r: TimeBlockRow): TimeBlock => ({
  id: r.id,
  dayId: r.day_id,
  startTime: r.start_time,
  endTime: r.end_time,
  title: r.title,
  location: r.location,
  note: r.note,
  category: r.category,
});

/**
 * Stores days 1 to `count` of a trip in one statement. Days that already exist are kept, so
 * this also fills gaps (e.g. after an interrupted write).
 */
export async function createDays(db: Db, tripId: string, count: number, startDate: string | null): Promise<void> {
  const days = generateDays(count, startDate);
  const params: SqlValue[] = days.flatMap((d) => [crypto.randomUUID(), tripId, d.dayNumber, d.date]);
  await db.execute(
    `INSERT INTO days (id, trip_id, day_number, date) VALUES ${days.map(() => '(?, ?, ?, ?)').join(', ')}
     ON CONFLICT (trip_id, day_number) DO NOTHING`,
    params,
  );
}

export async function listDays(db: Db, tripId: string): Promise<Day[]> {
  const rows = await db.select<DayRow>('SELECT id, trip_id, day_number, date FROM days WHERE trip_id = ? ORDER BY day_number', [
    tripId,
  ]);
  return rows.map(toDay);
}

const BLOCK_COLUMNS = 'b.id, b.day_id, b.start_time, b.end_time, b.title, b.location, b.note, b.category';

/** Every time block of a trip, by day and then by time. */
export async function listTimeBlocks(db: Db, tripId: string): Promise<TimeBlock[]> {
  const rows = await db.select<TimeBlockRow & { day_number: number }>(
    `SELECT ${BLOCK_COLUMNS}, d.day_number FROM time_blocks b JOIN days d ON d.id = b.day_id WHERE d.trip_id = ?`,
    [tripId],
  );
  const byDay = new Map<number, TimeBlock[]>();
  for (const row of rows) byDay.set(row.day_number, [...(byDay.get(row.day_number) ?? []), toBlock(row)]);
  return [...byDay.keys()].sort((a, b) => a - b).flatMap((n) => sortTimeBlocks(byDay.get(n)!));
}

export async function listTimeBlocksForDay(db: Db, dayId: string): Promise<TimeBlock[]> {
  const rows = await db.select<TimeBlockRow>(`SELECT ${BLOCK_COLUMNS} FROM time_blocks b WHERE b.day_id = ?`, [dayId]);
  return sortTimeBlocks(rows.map(toBlock));
}

function checked(input: TimeBlockInput): TimeBlockInput {
  const result = validateTimeBlock(input);
  if (!result.ok) throw new Error(Object.values(result.errors).join(' '));
  return result.value;
}

export async function createTimeBlock(
  db: Db,
  dayId: string,
  input: TimeBlockInput,
  now = new Date(),
  id = crypto.randomUUID(),
): Promise<TimeBlock> {
  const v = checked(input);
  const ts = now.toISOString();
  await db.execute(
    `INSERT INTO time_blocks (id, day_id, start_time, end_time, title, location, note, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dayId, v.startTime, v.endTime, v.title, v.location, v.note, v.category, ts, ts],
  );
  return { id, dayId, ...v };
}

export async function updateTimeBlock(db: Db, id: string, input: TimeBlockInput, now = new Date()): Promise<void> {
  const v = checked(input);
  const result = await db.execute(
    `UPDATE time_blocks SET start_time = ?, end_time = ?, title = ?, location = ?, note = ?, category = ?, updated_at = ?
     WHERE id = ?`,
    [v.startTime, v.endTime, v.title, v.location, v.note, v.category, now.toISOString(), id],
  );
  if (result.rowsAffected === 0) throw new Error('Diesen Zeitblock gibt es nicht mehr.');
}

export async function deleteTimeBlock(db: Db, id: string): Promise<void> {
  await db.execute('DELETE FROM time_blocks WHERE id = ?', [id]);
}

/** The clashes of one day (see `findOverlaps`): block id → ids of the blocks it overlaps. */
export async function dayOverlaps(db: Db, dayId: string): Promise<Map<string, string[]>> {
  return findOverlaps(await listTimeBlocksForDay(db, dayId));
}
