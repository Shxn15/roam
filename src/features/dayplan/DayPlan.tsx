import { CalendarPlus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDayPlanStore } from '../../data/dayPlanStore';
import { findOverlaps, minutesOf, type Day, type TimeBlock, type TimeBlockDraft } from '../../domain/dayPlan';
import { todayIso, type TripSummary } from '../../domain/trips';
import { Button } from '../../ui/Button';
import { notify, reportError } from '../../ui/toast';
import { DayList } from './DayList';
import { TimeBlockCard } from './TimeBlockCard';
import { TimeBlockForm } from './TimeBlockForm';
import { formatDayLong } from './format';
import styles from './DayPlan.module.css';

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (minutes: number) => (minutes >= 1440 ? '24:00' : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);

/** A new block starts where the day's last one ends (or at 9:00) and lasts an hour. */
function newBlockDraft(blocks: TimeBlock[]): TimeBlockDraft {
  const last = blocks[blocks.length - 1];
  const from = last ? minutesOf(last.endTime ?? last.startTime) : 9 * 60;
  const start = Math.min(from, 23 * 60);
  return { startTime: timeOf(start), endTime: timeOf(Math.min(start + 60, 1440)), title: '', location: '', note: '', category: 'activity' };
}

/** Days on the left, the chosen day's time blocks on the right. */
export function DayPlan({ trip }: { trip: TripSummary }) {
  const loadedTrip = useDayPlanStore((s) => s.tripId);
  const days = useDayPlanStore((s) => s.days);
  const blocks = useDayPlanStore((s) => s.blocks);
  const status = useDayPlanStore((s) => s.status);
  const [params, setParams] = useSearchParams();
  const today = todayIso();

  useEffect(() => {
    useDayPlanStore.getState().load(trip.id).catch(reportError('Tagesplan konnte nicht geladen werden'));
  }, [trip.id]);

  const current = loadedTrip === trip.id;
  const blocksByDay = useMemo(() => {
    const map = new Map<string, TimeBlock[]>();
    for (const b of blocks) map.set(b.dayId, [...(map.get(b.dayId) ?? []), b]);
    return map;
  }, [blocks]);
  const clashesByDay = useMemo(
    () => new Map(days.map((d) => [d.id, findOverlaps(blocksByDay.get(d.id) ?? [])])),
    [days, blocksByDay],
  );

  // The chosen day lives in the URL; by default today (under way) or day 1.
  const asked = Number(params.get('tag'));
  const day =
    days.find((d) => d.dayNumber === asked) ?? days.find((d) => d.date === today) ?? days[0] ?? null;
  const selectDay = (dayNumber: number) =>
    setParams(
      (p) => {
        p.set('tag', String(dayNumber));
        return p;
      },
      { replace: true },
    );

  if (!current || (status === 'loading' && days.length === 0)) {
    return <div className={styles.loading}>Tagesplan wird geladen …</div>;
  }
  if (!day) {
    return <div className={styles.loading}>Diese Reise hat noch keine Tage.</div>;
  }

  return (
    <div className={styles.plan}>
      <DayList days={days} blocksByDay={blocksByDay} clashesByDay={clashesByDay} selectedId={day.id} today={today} onSelect={selectDay} />
      <DayColumn
        key={day.id}
        day={day}
        dayCount={days.length}
        blocks={blocksByDay.get(day.id) ?? []}
        clashes={clashesByDay.get(day.id) ?? new Map()}
      />
    </div>
  );
}

interface DayColumnProps {
  day: Day;
  dayCount: number;
  blocks: TimeBlock[];
  clashes: Map<string, string[]>;
}

function DayColumn({ day, dayCount, blocks, clashes }: DayColumnProps) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const { addBlock, updateBlock, removeBlock } = useDayPlanStore.getState();
  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const clashCount = clashes.size;

  const create = async (input: Parameters<typeof addBlock>[1]) => {
    try {
      await addBlock(day.id, input);
      setEditing(null);
    } catch (error) {
      reportError('Zeitblock konnte nicht gespeichert werden')(error);
    }
  };
  const save = (id: string) => async (input: Parameters<typeof updateBlock>[1]) => {
    try {
      await updateBlock(id, input);
      setEditing(null);
    } catch (error) {
      reportError('Änderung konnte nicht gespeichert werden')(error);
    }
  };
  const remove = (block: TimeBlock) => {
    removeBlock(block.id).then(
      () => notify(`„${block.title}“ gelöscht`),
      reportError('Zeitblock konnte nicht gelöscht werden'),
    );
  };

  return (
    <section className={styles.day} aria-labelledby="day-title">
      <header className={styles.dayHeader}>
        <div>
          <h2 id="day-title" className={styles.dayTitle}>
            Tag {day.dayNumber} <span className={styles.dayOf}>von {dayCount}</span>
          </h2>
          <p className={styles.dayDate}>{day.date ? formatDayLong(day.date) : 'Ohne Datum – die Reise hat noch keinen Start'}</p>
        </div>
        {editing !== 'new' && (
          <Button variant="secondary" size="sm" icon={<Plus size={15} />} onClick={() => setEditing('new')}>
            Zeitblock
          </Button>
        )}
      </header>

      {clashCount > 0 && (
        <p className={styles.dayWarning} role="status">
          {clashCount === 2 ? 'Zwei Zeitblöcke überschneiden sich.' : `${clashCount} Zeitblöcke überschneiden sich.`} Das ist nur ein Hinweis – du kannst
          die Uhrzeiten anpassen oder es so lassen.
        </p>
      )}

      <div className={styles.blocks}>
        {editing === 'new' && (
          <TimeBlockForm initial={newBlockDraft(blocks)} others={blocks} submitLabel="Zeitblock anlegen" onSubmit={create} onCancel={() => setEditing(null)} />
        )}
        {blocks.map((block) =>
          editing === block.id ? (
            <TimeBlockForm
              key={block.id}
              initial={{ ...block }}
              others={blocks.filter((b) => b.id !== block.id)}
              submitLabel="Speichern"
              onSubmit={save(block.id)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <TimeBlockCard
              key={block.id}
              block={block}
              clashes={(clashes.get(block.id) ?? []).map((id) => byId.get(id)!).filter(Boolean)}
              onEdit={() => setEditing(block.id)}
              onDelete={() => remove(block)}
            />
          ),
        )}
        {blocks.length === 0 && editing !== 'new' && (
          <div className={styles.empty}>
            <CalendarPlus size={28} aria-hidden className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Für Tag {day.dayNumber} ist noch nichts geplant.</p>
            <p className={styles.emptyText}>Zeitblöcke haben eine Uhrzeit, einen Titel, einen Ort, eine Notiz und eine Kategorie.</p>
            <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setEditing('new')}>
              Ersten Zeitblock anlegen
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
