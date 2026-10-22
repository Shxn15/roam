import type { ContinentId } from '../geo/continents';
import { TRIP_STATUSES, type TripStatus } from './tripStatus';

export interface Trip {
  id: string;
  countryId: string;
  title: string;
  status: TripStatus;
  days: number;
  /** ISO date (YYYY-MM-DD); ideas have none. */
  startDate: string | null;
  createdAt: string;
}

export interface TripSummary extends Trip {
  countryName: string;
  continent: ContinentId;
}

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

/**
 * How far along a trip is, 0..1. Until the day plan exists (milestone 4) this is the
 * honest part: finished trips are complete, a trip under way counts its elapsed days,
 * everything before departure is 0.
 */
export function tripProgress(trip: Pick<Trip, 'status' | 'days' | 'startDate'>, today: string): number {
  if (trip.status === 'done') return 1;
  if (trip.status !== 'traveling' || !trip.startDate) return 0;
  const elapsed = utcDay(today) - utcDay(trip.startDate) + 1;
  return Math.min(1, Math.max(0, elapsed / trip.days));
}

/** Under way first, then planned, ideas, and finished trips last; newest first within a status. */
const ORDER: Record<TripStatus, number> = { traveling: 0, planned: 1, idea: 2, done: 3 };

export function sortTrips<T extends Pick<Trip, 'status' | 'createdAt'>>(trips: readonly T[]): T[] {
  return [...trips].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt));
}

export function isTripStatus(value: unknown): value is TripStatus {
  return TRIP_STATUSES.includes(value as TripStatus);
}

export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
