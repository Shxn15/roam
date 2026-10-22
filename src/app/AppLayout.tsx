import { Outlet } from 'react-router';
import { WorldMap } from '../features/map/WorldMap';
import { SettingsSheet } from '../features/settings/SettingsSheet';
import { Toaster } from '../ui/Toaster';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

/** "Schwebend": the map fills the window, everything else floats above it. */
export function AppLayout() {
  return (
    <div className={styles.app}>
      <WorldMap />
      <div className={styles.stage}>
        <Outlet />
      </div>
      <TopBar />
      <SettingsSheet />
      <Toaster />
    </div>
  );
}
