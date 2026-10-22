import type { ContinentId } from '../geo/continents';
import { MAX_DAYS, isIsoDate } from './dayPlan';
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

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** "Japan Oktober": the country and the month of the start date, or of today for trips without one. */
export function defaultTripTitle(countryName: string, startDate: string | null, today: string): string {
  const month = Number((startDate ?? today).slice(5, 7));
  return `${countryName} ${MONTHS[month - 1] ?? ''}`.trim();
}

export const MAX_TITLE_LENGTH = 80;

/** A new trip as the repository stores it. */
export interface NewTrip {
  countryId: string;
  title: string;
  status: TripStatus;
  days: number;
  startDate?: string | null;
}

export interface TripDraft {
  countryId: string;
  title: string;
  /** As typed: the form may hand over text. */
  days: number | string;
  status: TripStatus;
  startDate: string | null;
}

export type TripErrors = Partial<Record<'title' | 'days' | 'status' | 'startDate', string>>;

/**
 * Checks a new trip. An idea needs no start date (and drops one if given). A trip under way
 * needs one, because its progress counts the days since departure. Otherwise it is optional.
 */
export function validateTrip(draft: TripDraft): { ok: true; value: NewTrip } | { ok: false; errors: TripErrors } {
  const errors: TripErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Bitte einen Titel eingeben.';
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `Höchstens ${MAX_TITLE_LENGTH} Zeichen.`;

  const days = typeof draft.days === 'number' ? draft.days : Number(String(draft.days).trim() || NaN);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) errors.days = `Zwischen 1 und ${MAX_DAYS} Tagen.`;

  if (!isTripStatus(draft.status)) errors.status = 'Bitte einen Status wählen.';
  const startDate = draft.status === 'idea' ? null : draft.startDate || null;
  if (startDate !== null && !isIsoDate(startDate)) errors.startDate = 'Bitte ein gültiges Datum wählen.';
  if (draft.status === 'traveling' && startDate === null) errors.startDate = 'Unterwegs braucht ein Startdatum, um den Fortschritt zu zeigen.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { countryId: draft.countryId, title, status: draft.status, days, startDate } };
}
