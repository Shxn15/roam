import { Plus } from 'lucide-react';
import { useUi } from '../../app/uiStore';
import { useTravelStore } from '../../data/travelStore';
import { todayIso } from '../../domain/trips';
import { Panel } from '../../ui/Panel';
import { useOpenCountry } from '../country/useOpenCountry';
import { TripCard } from '../trips/TripCard';
import styles from './TripDock.module.css';

export function TripDock() {
  const trips = useTravelStore((s) => s.trips);
  const openCountry = useOpenCountry();
  const newTripIntent = useUi((s) => s.newTripIntent);
  const today = todayIso();
  return (
    <section className={styles.dock} aria-label="Reisen">
      <button
        type="button"
        className={styles.newTrip}
        aria-pressed={newTripIntent}
        title="Erst das Land wählen, dann die Reise anlegen"
        onClick={() => useUi.getState().setNewTripIntent(!newTripIntent)}
      >
        <span className={styles.plus}>
          <Plus size={20} />
        </span>
        {newTripIntent ? 'Land wählen …' : 'Neue Reise'}
      </button>
      {trips.length === 0 ? (
        <Panel className={styles.empty}>
          <h3 className={styles.emptyTitle}>Noch keine Reisen</h3>
          <p className={styles.emptyText}>
            Wähle ein Land auf der Karte oder über die Suche und leg dort deine erste Reise an – als Idee oder schon geplant.
          </p>
        </Panel>
      ) : (
        <div className={styles.scroller}>
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              today={today}
              showCountry
              opensCountry
              onOpen={() => openCountry(trip.countryId, { reise: trip.id })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
