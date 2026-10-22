import { describe, expect, it } from 'vitest';
import { createTrip, listTrips, listTripsForCountry } from '../db/repos/trips';
import { createTestDb } from '../db/testing';
import { sortTrips, tripProgress } from './trips';

describe('trip progress', () => {
  it('is 0 before departure, counts days under way and is complete when done', () => {
    expect(tripProgress({ status: 'idea', days: 10, startDate: null }, '2026-10-21')).toBe(0);
    expect(tripProgress({ status: 'planned', days: 10, startDate: '2026-11-01' }, '2026-10-21')).toBe(0);
    expect(tripProgress({ status: 'traveling', days: 10, startDate: '2026-10-17' }, '2026-10-21')).toBe(0.5);
    expect(tripProgress({ status: 'traveling', days: 4, startDate: '2026-10-01' }, '2026-10-21')).toBe(1);
    expect(tripProgress({ status: 'done', days: 7, startDate: null }, '2026-10-21')).toBe(1);
  });
});

describe('trips', () => {
  it('orders trips under way first and finished trips last', () => {
    const t = (status: 'idea' | 'planned' | 'traveling' | 'done', createdAt: string) => ({ status, createdAt });
    const sorted = sortTrips([t('done', '1'), t('idea', '1'), t('traveling', '1'), t('idea', '2'), t('planned', '1')]);
    expect(sorted.map((x) => `${x.status}${x.createdAt}`)).toEqual(['traveling1', 'planned1', 'idea2', 'idea1', 'done1']);
  });

  it('stores trips with their country and rejects nonsense', async () => {
    const db = await createTestDb({ seeded: true });
    await createTrip(db, { countryId: 'JPN', title: 'Japan Herbst', status: 'planned', days: 12, startDate: '2026-10-05' });
    await createTrip(db, { countryId: 'JPN', title: 'Japan Winter', status: 'idea', days: 9 });
    await createTrip(db, { countryId: 'ISL', title: 'Island', status: 'done', days: 8, startDate: '2024-06-01' });
    const all = await listTrips(db);
    expect(all.map((t) => t.title)).toEqual(['Japan Herbst', 'Japan Winter', 'Island']);
    expect(all[0]).toMatchObject({ countryName: 'Japan', continent: 'asia', days: 12 });
    expect((await listTripsForCountry(db, 'JPN')).length).toBe(2);
    await expect(createTrip(db, { countryId: 'XXX', title: 'Nirgendwo', status: 'idea', days: 3 })).rejects.toThrow();
    await expect(createTrip(db, { countryId: 'JPN', title: 'Zu lang', status: 'idea', days: 400 })).rejects.toThrow();
    await expect(
      createTrip(db, { countryId: 'JPN', title: 'Datum', status: 'planned', days: 3, startDate: '21.10.2026' }),
    ).rejects.toThrow();
  });
});
