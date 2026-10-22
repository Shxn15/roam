import { create } from 'zustand';
import { getDb } from '../db/instance';
import { listCountries, setVisited as saveVisited } from '../db/repos/countries';
import { createTrip as saveTrip, listTrips } from '../db/repos/trips';
import type { Country } from '../domain/countries';
import type { NewTrip, TripSummary } from '../domain/trips';

interface TravelState {
  countries: Country[];
  trips: TripSummary[];
  load(): Promise<void>;
  setVisited(id: string, visited: boolean, year?: number | null): Promise<void>;
  /** Stores a trip with its days and returns its id. */
  createTrip(input: NewTrip): Promise<string>;
}

/** Countries and trips as the UI sees them; the database stays the source of truth. */
export const useTravelStore = create<TravelState>((set, get) => ({
  countries: [],
  trips: [],
  async load() {
    const db = getDb();
    const [countries, trips] = await Promise.all([listCountries(db), listTrips(db)]);
    set({ countries, trips });
  },
  async setVisited(id, visited, year = null) {
    await saveVisited(getDb(), id, visited, year);
    set({
      countries: get().countries.map((c) =>
        c.id === id ? { ...c, visited, visitedYear: visited ? year : null } : c,
      ),
    });
  },
  async createTrip(input) {
    const db = getDb();
    const id = await saveTrip(db, input);
    set({ trips: await listTrips(db) });
    return id;
  },
}));
