import { useMapStore } from '../map/mapStore';
import { ContinentPanel } from './ContinentPanel';
import { CountryChips } from './CountryChips';
import { SearchPanel } from './SearchPanel';
import { TripDock } from './TripDock';
import { ZoomControls } from './ZoomControls';
import styles from './HomePage.module.css';

export function HomePage() {
  // While the plane flies to a country, the home panels step aside for the map.
  const leaving = useMapStore((s) => s.flyingTo !== null);
  return (
    <div className={styles.home} data-leaving={leaving || undefined}>
      <div className={styles.column}>
        <SearchPanel />
        <ContinentPanel />
        <CountryChips />
      </div>
      <ZoomControls />
      <TripDock />
    </div>
  );
}
