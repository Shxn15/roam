import { useState } from 'react';
import { CONTINENTS, type ContinentId } from '../../geo/continents';
import { Panel } from '../../ui/Panel';
import { cx } from '../../ui/cx';
import styles from './ContinentPanel.module.css';

export function ContinentPanel() {
  const [selected, setSelected] = useState<ContinentId | null>(null);
  // Visits are recorded from milestone 7 on; until then every count is honestly zero.
  const visited = (_id: ContinentId) => 0;
  const total = CONTINENTS.reduce((sum, c) => sum + visited(c.id), 0);

  return (
    <Panel padded={false} className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Kontinente</h2>
        <span className={styles.meta}>{total} Länder besucht</span>
      </header>
      <ul className={styles.list}>
        {CONTINENTS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={cx(styles.item, selected === c.id && styles.active)}
              aria-pressed={selected === c.id}
              onClick={() => setSelected(selected === c.id ? null : c.id)}
            >
              <span>{c.name}</span>
              <span className={styles.count} title="Besuchte Länder">
                {visited(c.id)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
