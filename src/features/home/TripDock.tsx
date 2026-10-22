import { Plus } from 'lucide-react';
import { useTravelStore } from '../../data/travelStore';
import { todayIso } from '../../domain/trips';
import { Panel } from '../../ui/Panel';
import { TripCard } from './TripCard';
import styles from './TripDock.module.css';

export function TripDock() {
  const trips = useTravelStore((s) => s.trips);
  const today = todayIso();
  return (
    <section className={styles.dock} aria-label="Reisen">
      <button type="button" className={styles.newTrip} disabled title="Reisen anlegen kommt in Schritt 3">
        <span className={styles.plus}>
          <Plus size={20} />
        </span>
        Neue Reise
      </button>
      {trips.length === 0 ? (
        <Panel className={styles.empty}>
          <h3 className={styles.emptyTitle}>Noch keine Reisen</h3>
          <p className={styles.emptyText}>
            Hier liegen bald deine Ideen, Pläne und Reisen – jeweils mit Status, Fortschritt und Anzahl der Tage.
          </p>
        </Panel>
      ) : (
        <div className={styles.scroller}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} today={today} />
          ))}
        </div>
      )}
    </section>
  );
}
