import { Plus } from 'lucide-react';
import type { TripSummary } from '../../domain/trips';
import { TripCard } from '../trips/TripCard';
import styles from './TripStrip.module.css';

interface TripStripProps {
  trips: TripSummary[];
  selectedId: string | null;
  today: string;
  onSelect(id: string): void;
  onNew(): void;
}

/** The trips to this country as cards (several per country), and a card to start a new one. */
export function TripStrip({ trips, selectedId, today, onSelect, onNew }: TripStripProps) {
  return (
    <div className={styles.strip} role="list" aria-label="Reisen in dieses Land">
      {trips.map((trip) => (
        <div role="listitem" key={trip.id} className={styles.item}>
          <TripCard trip={trip} today={today} selected={trip.id === selectedId} onOpen={() => onSelect(trip.id)} />
        </div>
      ))}
      <div role="listitem" className={styles.item}>
        <button type="button" className={styles.newTrip} onClick={onNew}>
          <span className={styles.plus}>
            <Plus size={18} />
          </span>
          Neue Reise
        </button>
      </div>
    </div>
  );
}
