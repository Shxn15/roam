import { create } from 'zustand';
import { getDb } from '../db/instance';
import { createTimeBlock, deleteTimeBlock, listDays, listTimeBlocks, updateTimeBlock } from '../db/repos/dayPlan';
import { sortTimeBlocks, type Day, type TimeBlock, type TimeBlockInput } from '../domain/dayPlan';

interface DayPlanState {
  /** The trip whose plan is loaded. */
  tripId: string | null;
  days: Day[];
  /** All blocks of the trip, by day and time. */
  blocks: TimeBlock[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  load(tripId: string): Promise<void>;
  addBlock(dayId: string, input: TimeBlockInput): Promise<TimeBlock>;
  updateBlock(id: string, input: TimeBlockInput): Promise<void>;
  removeBlock(id: string): Promise<void>;
}

const resort = (blocks: TimeBlock[], days: Day[]) => {
  const order = new Map(days.map((d) => [d.id, d.dayNumber]));
  const byDay = new Map<string, TimeBlock[]>();
  for (const b of blocks) byDay.set(b.dayId, [...(byDay.get(b.dayId) ?? []), b]);
  return [...byDay.keys()].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)).flatMap((id) => sortTimeBlocks(byDay.get(id)!));
};

/** The day plan of one trip. Writes go to SQLite first, then into this copy. */
export const useDayPlanStore = create<DayPlanState>((set, get) => ({
  tripId: null,
  days: [],
  blocks: [],
  status: 'idle',
  async load(tripId) {
    set({ tripId, status: 'loading', ...(get().tripId === tripId ? {} : { days: [], blocks: [] }) });
    try {
      const db = getDb();
      const [days, blocks] = await Promise.all([listDays(db, tripId), listTimeBlocks(db, tripId)]);
      if (get().tripId === tripId) set({ days, blocks, status: 'ready' });
    } catch (error) {
      if (get().tripId === tripId) set({ status: 'error' });
      throw error;
    }
  },
  async addBlock(dayId, input) {
    const block = await createTimeBlock(getDb(), dayId, input);
    set({ blocks: resort([...get().blocks, block], get().days) });
    return block;
  },
  async updateBlock(id, input) {
    await updateTimeBlock(getDb(), id, input);
    set({ blocks: resort(get().blocks.map((b) => (b.id === id ? { ...b, ...input } : b)), get().days) });
  },
  async removeBlock(id) {
    await deleteTimeBlock(getDb(), id);
    set({ blocks: get().blocks.filter((b) => b.id !== id) });
  },
}));
