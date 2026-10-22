import { Globe2, Minus, Plus } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';
import { Panel } from '../../ui/Panel';
import { mapActions } from '../map/mapStore';
import styles from './ZoomControls.module.css';

export function ZoomControls() {
  return (
    <Panel padded={false} className={styles.zoom}>
      <IconButton label="Hineinzoomen (+)" icon={<Plus size={18} />} onClick={mapActions.zoomIn} />
      <IconButton label="Herauszoomen (−)" icon={<Minus size={18} />} onClick={mapActions.zoomOut} />
      <span className={styles.divider} />
      <IconButton label="Ganze Welt (Esc)" icon={<Globe2 size={18} />} onClick={mapActions.clearSelection} />
    </Panel>
  );
}
