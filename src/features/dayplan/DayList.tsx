import { TriangleAlert } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import type { Day, TimeBlock } from '../../domain/dayPlan';
import { cx } from '../../ui/cx';
import { formatDayShort } from './format';
import styles from './DayList.module.css';

interface DayListProps {
  days: Day[];
  blocksByDay: Map<string, TimeBlock[]>;
  clashesByDay: Map<string, Map<string, string[]>>;
  selectedId: string | null;
  today: string;
  onSelect(dayNumber: number): void;
}

/** The days of the trip, with how much is planned and whether anything clashes. */
export function DayList({ days, blocksByDay, clashesByDay, selectedId, today, onSelect }: DayListProps) {
  const list = useRef<HTMLOListElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const index = days.findIndex((d) => d.id === selectedId);
    const next = days[Math.min(days.length - 1, Math.max(0, index + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (!next) return;
    e.preventDefault(); // neither scroll nor pan the map
    onSelect(next.dayNumber);
    list.current?.querySelector<HTMLButtonElement>(`[data-day="${next.dayNumber}"]`)?.focus();
  };

  return (
    <nav className={styles.nav} aria-label="Tage">
      <ol ref={list} className={styles.list} onKeyDown={onKeyDown}>
        {days.map((day) => {
          const count = blocksByDay.get(day.id)?.length ?? 0;
          const clashes = clashesByDay.get(day.id)?.size ?? 0;
          const selected = day.id === selectedId;
          return (
            <li key={day.id}>
              <button
                type="button"
                data-day={day.dayNumber}
                className={cx(styles.day, selected && styles.selected)}
                aria-current={selected ? 'date' : undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(day.dayNumber)}
              >
                <span className={styles.name}>
                  Tag {day.dayNumber}
                  {day.date === today && <span className={styles.today}>heute</span>}
                </span>
                <span className={styles.meta}>
                  {day.date ? formatDayShort(day.date) : 'ohne Datum'}
                  <span className={styles.count}>
                    {clashes > 0 && <TriangleAlert size={13} className={styles.clash} aria-label="Überschneidungen" />}
                    {count > 0 && `${count} ${count === 1 ? 'Block' : 'Blöcke'}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
