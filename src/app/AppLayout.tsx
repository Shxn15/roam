import { Outlet } from 'react-router';
import { WorldBackdrop } from '../features/map/WorldBackdrop';
import { SettingsSheet } from '../features/settings/SettingsSheet';
import { Toaster } from '../ui/Toaster';
import { HOME_MAP_INSETS } from './layout';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

/** "Schwebend": the map fills the window, everything else floats above it. */
export function AppLayout() {
  return (
    <div className={styles.app}>
      <WorldBackdrop insets={HOME_MAP_INSETS} />
      <div className={styles.stage}>
        <Outlet />
      </div>
      <TopBar />
      <SettingsSheet />
      <Toaster />
    </div>
  );
}
