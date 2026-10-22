import { ContinentPanel } from './ContinentPanel';
import { SearchPanel } from './SearchPanel';
import { TripDock } from './TripDock';
import { ZoomControls } from './ZoomControls';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.home}>
      <div className={styles.column}>
        <SearchPanel />
        <ContinentPanel />
      </div>
      <ZoomControls />
      <TripDock />
    </div>
  );
}
