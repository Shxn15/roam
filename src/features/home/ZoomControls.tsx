import { Globe2, Minus, Plus } from 'lucide-react';
import { IconButton } from '../../ui/IconButton';
import { Panel } from '../../ui/Panel';
import styles from './ZoomControls.module.css';

const SOON = 'Zoom folgt mit der interaktiven Karte (Meilenstein 2)';

export function ZoomControls() {
  return (
    <Panel padded={false} className={styles.zoom} title={SOON}>
      <IconButton label="Hineinzoomen" icon={<Plus size={18} />} disabled />
      <IconButton label="Herauszoomen" icon={<Minus size={18} />} disabled />
      <span className={styles.divider} />
      <IconButton label="Ganze Welt" icon={<Globe2 size={18} />} disabled />
    </Panel>
  );
}
