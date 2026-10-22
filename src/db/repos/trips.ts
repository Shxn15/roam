import { sortTrips, validateTrip, type NewTrip, type TripSummary } from '../../domain/trips';
import type { TripStatus } from '../../domain/tripStatus';
import type { ContinentId } from '../../geo/continents';
import type { Db } from '../types';
import { createDays } from './dayPlan';

export type { NewTrip } from '../../domain/trips';

interface TripRow {
  id: string;
  country_id: string;
  title: string;
  status: TripStatus;
  days: number;
  start_date: string | null;
  created_at: string;
  country_name: string;
  continent: ContinentId;
}

const toTrip = (r: TripRow): TripSummary => ({
  id: r.id,
  countryId: r.country_id,
  title: r.title,
  status: r.status,
  days: r.days,
  startDate: r.start_date,
  createdAt: r.created_at,
  countryName: r.country_name,
  continent: r.continent,
});

const SELECT = `
  SELECT t.id, t.country_id, t.title, t.status, t.days, t.start_date, t.created_at,
         c.name AS country_name, c.continent
  FROM trips t JOIN countries c ON c.id = t.country_id`;

export async function listTrips(db: Db): Promise<TripSummary[]> {
  return sortTrips((await db.select<TripRow>(SELECT)).map(toTrip));
}

export async function listTripsForCountry(db: Db, countryId: string): Promise<TripSummary[]> {
  return sortTrips((await db.select<TripRow>(`${SELECT} WHERE t.country_id = ?`, [countryId])).map(toTrip));
}

export async function getTrip(db: Db, id: string): Promise<TripSummary | undefined> {
  const rows = await db.select<TripRow>(`${SELECT} WHERE t.id = ?`, [id]);
  return rows[0] && toTrip(rows[0]);
}

/**
 * Creates a trip with its days (day 1 to N). Two statements instead of a transaction: the
 * desktop SQL plugin pools connections, so BEGIN and COMMIT could land on different ones. If
 * the days cannot be stored, the trip is removed again, so a trip never exists without days.
 */
export async function createTrip(db: Db, input: NewTrip, now = new Date(), id = crypto.randomUUID()): Promise<string> {
  const checked = validateTrip({ ...input, startDate: input.startDate ?? null });
  if (!checked.ok) throw new Error(Object.values(checked.errors).join(' '));
  const trip = checked.value;
  await db.execute(
    'INSERT INTO trips (id, country_id, title, status, days, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, trip.countryId, trip.title, trip.status, trip.days, trip.startDate ?? null, now.toISOString()],
  );
  try {
    await createDays(db, id, trip.days, trip.startDate ?? null);
  } catch (error) {
    await db.execute('DELETE FROM trips WHERE id = ?', [id]).catch(() => undefined);
    throw error;
  }
  return id;
}
