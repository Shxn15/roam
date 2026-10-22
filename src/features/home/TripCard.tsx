import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router';
import { tripProgress, type TripSummary } from '../../domain/trips';
import { ProgressBar } from '../../ui/ProgressBar';
import { StatusChip } from '../../ui/StatusChip';
import styles from './TripCard.module.css';

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

export function TripCard({ trip, today }: { trip: TripSummary; today: string }) {
  const navigate = useNavigate();
  const progress = tripProgress(trip, today);
  return (
    <button type="button" className={styles.card} onClick={() => navigate(`/land/${trip.countryId}`)}>
      <span className={styles.head}>
        <span className={styles.title}>{trip.title}</span>
        <StatusChip status={trip.status} />
      </span>
      <span className={styles.country}>{trip.countryName}</span>
      <ProgressBar value={progress} label={`Fortschritt ${Math.round(progress * 100)} %`} />
      <span className={styles.foot}>
        <span>
          <CalendarDays size={13} aria-hidden /> {trip.days} {trip.days === 1 ? 'Tag' : 'Tage'}
        </span>
        <span>{trip.startDate ? dateFormat.format(new Date(`${trip.startDate}T12:00:00`)) : 'ohne Datum'}</span>
      </span>
    </button>
  );
}
