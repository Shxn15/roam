import { Plus } from 'lucide-react';
import { Panel } from '../../ui/Panel';
import styles from './TripDock.module.css';

export function TripDock() {
  return (
    <section className={styles.dock} aria-label="Reisen">
      <button type="button" className={styles.newTrip} disabled title="Reisen anlegen: Meilenstein 3">
        <span className={styles.plus}>
          <Plus size={20} />
        </span>
        Neue Reise
      </button>
      <Panel className={styles.empty}>
        <h3 className={styles.emptyTitle}>Noch keine Reisen</h3>
        <p className={styles.emptyText}>
          Hier liegen bald deine Ideen, Pläne und Reisen – jeweils mit Status, Fortschritt und Anzahl der Tage.
        </p>
      </Panel>
    </section>
  );
}
