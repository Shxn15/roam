import { CalendarDays, Check } from 'lucide-react';
import { tripProgress, type TripSummary } from '../../domain/trips';
import { ProgressBar } from '../../ui/ProgressBar';
import { StatusChip } from '../../ui/StatusChip';
import { cx } from '../../ui/cx';
import styles from './TripCard.module.css';

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

interface TripCardProps {
  trip: TripSummary;
  today: string;
  onOpen(): void;
  selected?: boolean;
  /** The home dock names the country; inside the country tab it is obvious. */
  showCountry?: boolean;
  /** The card flies to its country (home dock), see `useOpenCountry`. */
  opensCountry?: boolean;
}

/**
 * A trip as a card. The status shows in the frame: an idea has a dashed border, a planned or
 * finished trip a plain one, and a trip under way carries its progress bar.
 */
export function TripCard({ trip, today, onOpen, selected, showCountry = false, opensCountry = false }: TripCardProps) {
  const progress = tripProgress(trip, today);
  const dayToday = Math.round(progress * trip.days);
  return (
    <button
      type="button"
      className={cx(styles.card, styles[trip.status], selected && styles.selected)}
      aria-current={selected || undefined}
      data-opens-country={opensCountry ? '' : undefined}
      onClick={onOpen}
    >
      <span className={styles.head}>
        <span className={styles.title}>{trip.title}</span>
        <StatusChip status={trip.status} />
      </span>
      {showCountry && <span className={styles.country}>{trip.countryName}</span>}
      {trip.status === 'traveling' && (
        <span className={styles.progress}>
          <ProgressBar value={progress} label={`Fortschritt ${Math.round(progress * 100)} %`} />
          <span className={styles.progressText}>
            Tag {Math.max(1, dayToday)} von {trip.days}
          </span>
        </span>
      )}
      <span className={styles.foot}>
        <span>
          <CalendarDays size={13} aria-hidden /> {trip.days} {trip.days === 1 ? 'Tag' : 'Tage'}
        </span>
        <span>
          {trip.status === 'done' && <Check size={13} aria-hidden />}
          {trip.startDate
            ? dateFormat.format(new Date(`${trip.startDate}T12:00:00`))
            : trip.status === 'idea'
              ? 'noch ohne Datum'
              : 'ohne Datum'}
        </span>
      </span>
    </button>
  );
}
