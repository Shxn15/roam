/** What a time block is about. Each category has a label, an icon (UI) and one of the theme's tints. */
export const TIME_BLOCK_CATEGORIES = ['activity', 'food', 'transport', 'stay'] as const;
export type TimeBlockCategory = (typeof TIME_BLOCK_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TimeBlockCategory, string> = {
  activity: 'Aktivität',
  food: 'Essen',
  transport: 'Transport',
  stay: 'Unterkunft',
};

/** Which of the theme's four tints represents each category. */
export const CATEGORY_TINT: Record<TimeBlockCategory, 1 | 2 | 3 | 4> = {
  activity: 3,
  food: 4,
  transport: 2,
  stay: 1,
};

export interface Day {
  id: string;
  tripId: string;
  /** 1-based. */
  dayNumber: number;
  /** ISO date (YYYY-MM-DD); trips without a start date (ideas) have days without dates. */
  date: string | null;
}

export interface TimeSpan {
  /** "HH:MM", 24 h. */
  startTime: string;
  /** "HH:MM" after the start ("24:00" is midnight), or null for a moment such as a check-in. */
  endTime: string | null;
}

export interface TimeBlock extends TimeSpan {
  id: string;
  dayId: string;
  title: string;
  location: string;
  note: string;
  category: TimeBlockCategory;
}

/** What the form edits and the repository stores. */
export type TimeBlockInput = Omit<TimeBlock, 'id' | 'dayId'>;

export const MAX_DAYS = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Adds whole days to an ISO date, in UTC, so daylight saving never shifts a day. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The days of a trip: day 1 to N, dated from the start date when there is one. */
export function generateDays(count: number, startDate: string | null): { dayNumber: number; date: string | null }[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_DAYS) {
    throw new Error(`Eine Reise hat 1 bis ${MAX_DAYS} Tage (nicht ${count}).`);
  }
  if (startDate !== null && !isIsoDate(startDate)) throw new Error(`Ungültiges Startdatum: ${startDate}`);
  return Array.from({ length: count }, (_, i) => ({
    dayNumber: i + 1,
    date: startDate === null ? null : addDays(startDate, i),
  }));
}

const START_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const END_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export const isStartTime = (t: unknown): t is string => typeof t === 'string' && START_TIME.test(t);
export const isEndTime = (t: unknown): t is string => typeof t === 'string' && END_TIME.test(t);

/** Minutes since midnight of "HH:MM". */
export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/**
 * Whether two blocks clash. Spans overlap when one starts before the other ends; blocks that
 * only touch (one ends at 10:00, the next starts at 10:00) do not. A block without an end time
 * is a moment: it clashes with a span running at that moment (its start included) and with
 * another moment at the same minute.
 */
export function blocksOverlap(a: TimeSpan, b: TimeSpan): boolean {
  const aStart = minutesOf(a.startTime);
  const bStart = minutesOf(b.startTime);
  const aEnd = a.endTime === null ? null : minutesOf(a.endTime);
  const bEnd = b.endTime === null ? null : minutesOf(b.endTime);
  if (aEnd === null && bEnd === null) return aStart === bStart;
  if (aEnd === null) return bStart <= aStart && aStart < bEnd!;
  if (bEnd === null) return aStart <= bStart && bStart < aEnd;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * All clashes within one day: for each block that overlaps another, the ids of the blocks it
 * overlaps, in time order. Blocks without clashes are not in the map. A warning, never a rule.
 */
export function findOverlaps<T extends TimeSpan & { id: string }>(blocks: readonly T[]): Map<string, string[]> {
  const sorted = sortTimeBlocks(blocks);
  const result = new Map<string, string[]>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (!blocksOverlap(a, b)) continue;
      result.set(a.id, [...(result.get(a.id) ?? []), b.id]);
      result.set(b.id, [...(result.get(b.id) ?? []), a.id]);
    }
  }
  const order = new Map(sorted.map((block, index) => [block.id, index]));
  for (const [id, others] of result) result.set(id, others.sort((x, y) => order.get(x)! - order.get(y)!));
  return result;
}

const collator = new Intl.Collator('de', { sensitivity: 'base' });

/**
 * By start time. At the same start a moment comes before a span and a shorter span before a
 * longer one; then alphabetically, so the order never jumps between renders.
 */
export function sortTimeBlocks<T extends TimeSpan & { title?: string; id?: string }>(blocks: readonly T[]): T[] {
  const end = (b: TimeSpan) => (b.endTime === null ? -1 : minutesOf(b.endTime));
  return [...blocks].sort(
    (a, b) =>
      minutesOf(a.startTime) - minutesOf(b.startTime) ||
      end(a) - end(b) ||
      collator.compare(a.title ?? '', b.title ?? '') ||
      (a.id ?? '').localeCompare(b.id ?? ''),
  );
}

export const TIME_BLOCK_LIMITS = { title: 120, location: 120, note: 2000 } as const;

export interface TimeBlockDraft {
  startTime: string;
  /** Empty means: no end time. */
  endTime: string | null;
  title: string;
  location: string;
  note: string;
  category: TimeBlockCategory;
}

export type TimeBlockErrors = Partial<Record<'startTime' | 'endTime' | 'title' | 'location' | 'note' | 'category', string>>;

/** Checks and normalizes what the form entered. An end of "00:00" after a start means midnight. */
export function validateTimeBlock(draft: TimeBlockDraft): { ok: true; value: TimeBlockInput } | { ok: false; errors: TimeBlockErrors } {
  const errors: TimeBlockErrors = {};
  const title = draft.title.trim();
  const location = draft.location.trim();
  const note = draft.note.trim();
  if (!title) errors.title = 'Bitte einen Titel eingeben.';
  else if (title.length > TIME_BLOCK_LIMITS.title) errors.title = `Höchstens ${TIME_BLOCK_LIMITS.title} Zeichen.`;
  if (location.length > TIME_BLOCK_LIMITS.location) errors.location = `Höchstens ${TIME_BLOCK_LIMITS.location} Zeichen.`;
  if (note.length > TIME_BLOCK_LIMITS.note) errors.note = `Höchstens ${TIME_BLOCK_LIMITS.note} Zeichen.`;
  if (!TIME_BLOCK_CATEGORIES.includes(draft.category)) errors.category = 'Bitte eine Kategorie wählen.';

  const startTime = draft.startTime.trim();
  let endTime: string | null = draft.endTime?.trim() || null;
  if (!isStartTime(startTime)) errors.startTime = 'Bitte eine Uhrzeit wie 09:30 eingeben.';
  if (endTime !== null) {
    if (endTime === '00:00' && isStartTime(startTime) && startTime !== '00:00') endTime = '24:00';
    if (!isEndTime(endTime)) errors.endTime = 'Bitte eine Uhrzeit wie 11:00 eingeben.';
    else if (isStartTime(startTime) && minutesOf(endTime) <= minutesOf(startTime)) {
      errors.endTime = 'Das Ende muss nach dem Beginn liegen. Über Mitternacht bitte auf zwei Tage aufteilen.';
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { startTime, endTime, title, location, note, category: draft.category } };
}

/** "09:00–11:30", "ab 15:00" for moments. */
export function formatTimeSpan({ startTime, endTime }: TimeSpan): string {
  return endTime === null ? `ab ${startTime}` : `${startTime}–${endTime}`;
}
