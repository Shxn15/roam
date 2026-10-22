import { describe, expect, it } from 'vitest';
import {
  blocksOverlap,
  findOverlaps,
  formatTimeSpan,
  generateDays,
  sortTimeBlocks,
  validateTimeBlock,
  type TimeBlockDraft,
} from './dayPlan';
import { defaultTripTitle, validateTrip } from './trips';

const span = (id: string, startTime: string, endTime: string | null = null) => ({ id, startTime, endTime, title: id });

describe('days of a trip', () => {
  it('creates day 1 to N, dated from the start across month and year ends', () => {
    const days = generateDays(5, '2026-12-29');
    expect(days.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(days.map((d) => d.date)).toEqual(['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('keeps every day undated for a trip without a start date', () => {
    const days = generateDays(3, null);
    expect(days).toEqual([
      { dayNumber: 1, date: null },
      { dayNumber: 2, date: null },
      { dayNumber: 3, date: null },
    ]);
  });

  it('is not thrown off by daylight saving time or leap days', () => {
    expect(generateDays(3, '2026-03-28').map((d) => d.date)).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
    expect(generateDays(2, '2028-02-28').map((d) => d.date)).toEqual(['2028-02-28', '2028-02-29']);
  });

  it('rejects impossible day counts and dates', () => {
    expect(() => generateDays(0, null)).toThrow();
    expect(() => generateDays(366, null)).toThrow();
    expect(() => generateDays(2.5, null)).toThrow();
    expect(() => generateDays(3, '2026-02-30')).toThrow();
  });
});

describe('overlapping time blocks', () => {
  it('finds two blocks that overlap', () => {
    const museum = span('museum', '09:00', '11:00');
    const tea = span('tea', '10:30', '12:00');
    expect(blocksOverlap(museum, tea)).toBe(true);
    expect(blocksOverlap(tea, museum)).toBe(true);
    expect(findOverlaps([tea, museum])).toEqual(
      new Map([
        ['museum', ['tea']],
        ['tea', ['museum']],
      ]),
    );
  });

  it('leaves two blocks alone that do not overlap, even when one ends as the next begins', () => {
    const breakfast = span('breakfast', '08:00', '09:00');
    const walk = span('walk', '09:00', '10:30');
    const lunch = span('lunch', '12:00', '13:00');
    expect(blocksOverlap(breakfast, walk)).toBe(false);
    expect(blocksOverlap(walk, lunch)).toBe(false);
    expect(findOverlaps([breakfast, walk, lunch]).size).toBe(0);
  });

  it('treats a block without end time as a moment', () => {
    const tour = span('tour', '14:00', '16:00');
    const checkIn = span('checkIn', '15:00'); // during the tour
    const train = span('train', '16:00'); // exactly when the tour ends
    const dinner = span('dinner', '19:00');
    expect(blocksOverlap(tour, checkIn)).toBe(true);
    expect(blocksOverlap(checkIn, tour)).toBe(true);
    expect(blocksOverlap(tour, train)).toBe(false);
    expect(blocksOverlap(checkIn, dinner)).toBe(false);
    expect(blocksOverlap(span('a', '15:00'), span('b', '15:00'))).toBe(true); // two things at the same minute
    expect(blocksOverlap(span('a', '14:00'), tour)).toBe(true); // starts together with the tour
    expect(findOverlaps([dinner, train, checkIn, tour])).toEqual(
      new Map([
        ['tour', ['checkIn']],
        ['checkIn', ['tour']],
      ]),
    );
  });

  it('lists every clash of a block in time order', () => {
    const long = span('long', '09:00', '17:00');
    const a = span('a', '13:00', '14:00');
    const b = span('b', '10:00', '11:00');
    expect(findOverlaps([long, a, b]).get('long')).toEqual(['b', 'a']);
  });
});

describe('sorting time blocks', () => {
  it('orders by start time, moments before spans, shorter before longer', () => {
    const blocks = [
      span('dinner', '19:30', '21:00'),
      span('museum', '10:00', '12:30'),
      span('breakfast', '08:15', '09:00'),
      span('tea', '10:00', '11:00'),
      span('meet', '10:00'),
      span('night', '23:00', '24:00'),
    ];
    expect(sortTimeBlocks(blocks).map((b) => b.id)).toEqual(['breakfast', 'meet', 'tea', 'museum', 'dinner', 'night']);
    expect(blocks[0]!.id).toBe('dinner'); // the input stays untouched
  });

  it('compares times as times, not as text of different lengths', () => {
    expect(sortTimeBlocks([span('late', '10:05'), span('early', '09:55')]).map((b) => b.id)).toEqual(['early', 'late']);
  });
});

describe('time block input', () => {
  const draft = (patch: Partial<TimeBlockDraft> = {}): TimeBlockDraft => ({
    startTime: '09:00',
    endTime: '11:00',
    title: '  Fushimi Inari  ',
    location: ' Kyoto ',
    note: '',
    category: 'activity',
    ...patch,
  });

  it('trims text and accepts a block without end time', () => {
    expect(validateTimeBlock(draft())).toEqual({
      ok: true,
      value: { startTime: '09:00', endTime: '11:00', title: 'Fushimi Inari', location: 'Kyoto', note: '', category: 'activity' },
    });
    expect(validateTimeBlock(draft({ endTime: '' }))).toMatchObject({ ok: true, value: { endTime: null } });
  });

  it('reads an end of 00:00 as midnight and rejects ends before the start', () => {
    expect(validateTimeBlock(draft({ startTime: '22:00', endTime: '00:00' }))).toMatchObject({ ok: true, value: { endTime: '24:00' } });
    expect(validateTimeBlock(draft({ startTime: '11:00', endTime: '10:00' }))).toMatchObject({ ok: false, errors: { endTime: expect.any(String) } });
    expect(validateTimeBlock(draft({ startTime: '11:00', endTime: '11:00' })).ok).toBe(false);
  });

  it('needs a title and real times', () => {
    expect(validateTimeBlock(draft({ title: '   ' }))).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(validateTimeBlock(draft({ startTime: '9:00' })).ok).toBe(false);
    expect(validateTimeBlock(draft({ startTime: '24:00' })).ok).toBe(false);
    expect(validateTimeBlock(draft({ endTime: '25:00' })).ok).toBe(false);
  });

  it('formats spans and moments', () => {
    expect(formatTimeSpan({ startTime: '09:00', endTime: '11:30' })).toBe('09:00–11:30');
    expect(formatTimeSpan({ startTime: '15:00', endTime: null })).toBe('ab 15:00');
  });
});

describe('new trip input', () => {
  const base = { countryId: 'JPN', title: 'Japan Oktober', days: 10 };

  it('lets an idea go without a start date, and drops one if given', () => {
    expect(validateTrip({ ...base, status: 'idea', startDate: null })).toEqual({
      ok: true,
      value: { ...base, status: 'idea', startDate: null },
    });
    expect(validateTrip({ ...base, status: 'idea', startDate: '2027-04-01' })).toMatchObject({ ok: true, value: { startDate: null } });
  });

  it('keeps the start date optional for planned and finished trips, but not under way', () => {
    expect(validateTrip({ ...base, status: 'planned', startDate: null }).ok).toBe(true);
    expect(validateTrip({ ...base, status: 'done', startDate: null }).ok).toBe(true);
    expect(validateTrip({ ...base, status: 'traveling', startDate: null })).toMatchObject({ ok: false, errors: { startDate: expect.any(String) } });
    expect(validateTrip({ ...base, status: 'traveling', startDate: '2026-10-20' }).ok).toBe(true);
  });

  it('checks title, day count and date', () => {
    expect(validateTrip({ ...base, title: ' ', status: 'idea', startDate: null })).toMatchObject({ errors: { title: expect.any(String) } });
    expect(validateTrip({ ...base, days: '0', status: 'idea', startDate: null })).toMatchObject({ errors: { days: expect.any(String) } });
    expect(validateTrip({ ...base, days: '12', status: 'idea', startDate: null })).toMatchObject({ ok: true, value: { days: 12 } });
    expect(validateTrip({ ...base, days: 366, status: 'idea', startDate: null }).ok).toBe(false);
    expect(validateTrip({ ...base, status: 'planned', startDate: '2026-13-01' }).ok).toBe(false);
  });

  it('suggests "country + month" as the title', () => {
    expect(defaultTripTitle('Japan', null, '2026-10-22')).toBe('Japan Oktober');
    expect(defaultTripTitle('Italien', '2027-03-14', '2026-10-22')).toBe('Italien März');
  });
});
