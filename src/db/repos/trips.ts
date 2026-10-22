import { sortTrips, type TripSummary } from '../../domain/trips';
import type { TripStatus } from '../../domain/tripStatus';
import type { ContinentId } from '../../geo/continents';
import type { Db } from '../types';

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

export interface NewTrip {
  countryId: string;
  title: string;
  status: TripStatus;
  days: number;
  startDate?: string | null;
}

/** Creating trips gets its own UI in milestone 3; the repository is ready for it. */
export async function createTrip(db: Db, input: NewTrip, now = new Date(), id = crypto.randomUUID()): Promise<string> {
  await db.execute(
    'INSERT INTO trips (id, country_id, title, status, days, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, input.countryId, input.title.trim(), input.status, input.days, input.startDate ?? null, now.toISOString()],
  );
  return id;
}
