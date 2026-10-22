import { describe, expect, it } from 'vitest';
import type { TimeBlockInput } from '../domain/dayPlan';
import { MIGRATIONS, migrate } from './migrations';
import { seedCountries } from './repos/countries';
import {
  createTimeBlock,
  dayOverlaps,
  deleteTimeBlock,
  listDays,
  listTimeBlocks,
  listTimeBlocksForDay,
  updateTimeBlock,
} from './repos/dayPlan';
import { createTrip, getTrip } from './repos/trips';
import { createTestDb } from './testing';
import { ATLAS } from '../geo/atlas';

const block = (patch: Partial<TimeBlockInput> = {}): TimeBlockInput => ({
  startTime: '09:00',
  endTime: '11:00',
  title: 'Fushimi Inari',
  location: 'Kyoto',
  note: '',
  category: 'activity',
  ...patch,
});

describe('creating a trip', () => {
  it('creates its days 1 to N with dates from the start date', async () => {
    const db = await createTestDb({ seeded: true });
    const id = await createTrip(db, { countryId: 'JPN', title: 'Japan Herbst', status: 'planned', days: 12, startDate: '2026-10-25' });
    const days = await listDays(db, id);
    expect(days).toHaveLength(12);
    expect(days.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(days[0]!.date).toBe('2026-10-25');
    expect(days[11]!.date).toBe('2026-11-05');
    expect(await getTrip(db, id)).toMatchObject({ title: 'Japan Herbst', days: 12, countryName: 'Japan' });
  });

  it('stores an idea without a start date, with undated days', async () => {
    const db = await createTestDb({ seeded: true });
    const id = await createTrip(db, { countryId: 'ITA', title: 'Italien irgendwann', status: 'idea', days: 4 });
    expect((await getTrip(db, id))?.startDate).toBeNull();
    expect((await listDays(db, id)).map((d) => d.date)).toEqual([null, null, null, null]);
  });

  it('allows several trips per country, each with its own days', async () => {
    const db = await createTestDb({ seeded: true });
    const autumn = await createTrip(db, { countryId: 'JPN', title: 'Japan Herbst', status: 'planned', days: 3, startDate: '2026-10-01' });
    const winter = await createTrip(db, { countryId: 'JPN', title: 'Japan Winter', status: 'idea', days: 2 });
    expect((await listDays(db, autumn)).length).toBe(3);
    expect((await listDays(db, winter)).length).toBe(2);
  });

  it('stores the longest trip in its single statement (365 days, 1460 parameters)', async () => {
    const db = await createTestDb({ seeded: true });
    const id = await createTrip(db, { countryId: 'JPN', title: 'Ein Jahr Japan', status: 'planned', days: 365, startDate: '2027-01-01' });
    const days = await listDays(db, id);
    expect(days).toHaveLength(365);
    expect(days[364]).toMatchObject({ dayNumber: 365, date: '2027-12-31' });
  });

  it('leaves nothing behind when the trip is rejected', async () => {
    const db = await createTestDb({ seeded: true });
    await expect(createTrip(db, { countryId: 'XXX', title: 'Nirgendwo', status: 'idea', days: 3 })).rejects.toThrow();
    await expect(createTrip(db, { countryId: 'JPN', title: 'Ohne Datum', status: 'traveling', days: 3 })).rejects.toThrow(/Startdatum/);
    const [count] = await db.select<{ trips: number; days: number }>(
      'SELECT (SELECT count(*) FROM trips) AS trips, (SELECT count(*) FROM days) AS days',
    );
    expect(count).toEqual({ trips: 0, days: 0 });
  });
});

describe('time blocks', () => {
  async function tripWithDays() {
    const db = await createTestDb({ seeded: true });
    const tripId = await createTrip(db, { countryId: 'JPN', title: 'Japan', status: 'planned', days: 2, startDate: '2026-11-02' });
    const [day1, day2] = await listDays(db, tripId);
    return { db, tripId, day1: day1!, day2: day2! };
  }

  it('creates, sorts, updates and deletes blocks', async () => {
    const { db, tripId, day1, day2 } = await tripWithDays();
    await createTimeBlock(db, day1.id, block({ startTime: '13:00', endTime: '14:00', title: 'Mittag', category: 'food' }));
    const temple = await createTimeBlock(db, day1.id, block());
    await createTimeBlock(db, day2.id, block({ startTime: '08:00', endTime: null, title: 'Shinkansen', category: 'transport' }));

    expect((await listTimeBlocksForDay(db, day1.id)).map((b) => b.title)).toEqual(['Fushimi Inari', 'Mittag']);
    expect((await listTimeBlocks(db, tripId)).map((b) => b.title)).toEqual(['Fushimi Inari', 'Mittag', 'Shinkansen']);

    await updateTimeBlock(db, temple.id, block({ startTime: '15:30', endTime: '17:00', note: 'Bei Sonnenuntergang' }));
    const day1Blocks = await listTimeBlocksForDay(db, day1.id);
    expect(day1Blocks.map((b) => b.title)).toEqual(['Mittag', 'Fushimi Inari']);
    expect(day1Blocks[1]).toMatchObject({ startTime: '15:30', note: 'Bei Sonnenuntergang', location: 'Kyoto' });

    await deleteTimeBlock(db, temple.id);
    expect((await listTimeBlocksForDay(db, day1.id)).map((b) => b.title)).toEqual(['Mittag']);
    await expect(updateTimeBlock(db, temple.id, block())).rejects.toThrow(/nicht mehr/);
  });

  it('reports overlaps per day without refusing them', async () => {
    const { db, day1, day2 } = await tripWithDays();
    const museum = await createTimeBlock(db, day1.id, block({ title: 'Museum', startTime: '10:00', endTime: '12:00' }));
    const tea = await createTimeBlock(db, day1.id, block({ title: 'Teezeremonie', startTime: '11:30', endTime: '12:30' }));
    await createTimeBlock(db, day1.id, block({ title: 'Ramen', startTime: '12:30', endTime: '13:30', category: 'food' }));
    await createTimeBlock(db, day2.id, block({ title: 'Anderer Tag', startTime: '11:00', endTime: '12:00' }));
    expect(await dayOverlaps(db, day1.id)).toEqual(
      new Map([
        [museum.id, [tea.id]],
        [tea.id, [museum.id]],
      ]),
    );
    expect((await dayOverlaps(db, day2.id)).size).toBe(0);
  });

  it('refuses invalid blocks, also directly in the database', async () => {
    const { db, day1 } = await tripWithDays();
    await expect(createTimeBlock(db, day1.id, block({ endTime: '08:00' }))).rejects.toThrow();
    await expect(createTimeBlock(db, day1.id, block({ title: ' ' }))).rejects.toThrow();
    await expect(createTimeBlock(db, 'kein-tag', block())).rejects.toThrow();
    const insert = (start: string, end: string | null, category = 'activity') =>
      db.execute(
        `INSERT INTO time_blocks (id, day_id, start_time, end_time, title, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'x', ?, 'now', 'now')`,
        [crypto.randomUUID(), day1.id, start, end, category],
      );
    await expect(insert('25:00', null)).rejects.toThrow();
    await expect(insert('10:00', '09:00')).rejects.toThrow();
    await expect(insert('10:00', null, 'party')).rejects.toThrow();
    await expect(insert('23:00', '24:00')).resolves.toBeDefined();
  });

  it('disappear together with their trip', async () => {
    const { db, tripId, day1 } = await tripWithDays();
    await createTimeBlock(db, day1.id, block());
    await db.execute('DELETE FROM trips WHERE id = ?', [tripId]);
    const [left] = await db.select<{ days: number; blocks: number }>(
      'SELECT (SELECT count(*) FROM days) AS days, (SELECT count(*) FROM time_blocks) AS blocks',
    );
    expect(left).toEqual({ days: 0, blocks: 0 });
  });
});

describe('migration 3', () => {
  it('gives trips from before the day plan their days', async () => {
    const db = await createTestDb({ migrated: false });
    await migrate(db, MIGRATIONS.slice(0, 2));
    await seedCountries(db, ATLAS.countries);
    const insert = (id: string, days: number, start: string | null) =>
      db.execute("INSERT INTO trips (id, country_id, title, status, days, start_date, created_at) VALUES (?, 'JPN', 'Alt', 'planned', ?, ?, 'now')", [
        id,
        days,
        start,
      ]);
    await insert('dated', 3, '2026-12-31');
    await insert('undated', 2, null);
    await migrate(db);
    expect((await listDays(db, 'dated')).map((d) => [d.dayNumber, d.date])).toEqual([
      [1, '2026-12-31'],
      [2, '2027-01-01'],
      [3, '2027-01-02'],
    ]);
    expect((await listDays(db, 'undated')).map((d) => [d.dayNumber, d.date])).toEqual([
      [1, null],
      [2, null],
    ]);
  });
});
