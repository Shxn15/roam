import { create } from 'zustand';
import { getDb } from '../db/instance';
import { listCountries, setVisited as saveVisited } from '../db/repos/countries';
import { listTrips } from '../db/repos/trips';
import type { Country } from '../domain/countries';
import type { TripSummary } from '../domain/trips';

interface TravelState {
  countries: Country[];
  trips: TripSummary[];
  load(): Promise<void>;
  setVisited(id: string, visited: boolean, year?: number | null): Promise<void>;
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
}));
