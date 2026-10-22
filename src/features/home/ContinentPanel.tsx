import { useMemo } from 'react';
import { useTravelStore } from '../../data/travelStore';
import { visitedByContinent } from '../../domain/countries';
import { CONTINENTS } from '../../geo/continents';
import { Panel } from '../../ui/Panel';
import { cx } from '../../ui/cx';
import { mapActions, useMapStore } from '../map/mapStore';
import styles from './ContinentPanel.module.css';

export function ContinentPanel() {
  const countries = useTravelStore((s) => s.countries);
  const selected = useMapStore((s) => s.selected);
  const counts = useMemo(() => visitedByContinent(countries), [countries]);
  const total = countries.filter((c) => c.visited).length;

  return (
    <Panel padded={false} className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Kontinente</h2>
        <span className={styles.meta}>
          {total} {total === 1 ? 'Land' : 'Länder'} besucht
        </span>
      </header>
      <ul className={styles.list}>
        {CONTINENTS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={cx(styles.item, selected === c.id && styles.active)}
              aria-pressed={selected === c.id}
              onClick={() => (selected === c.id ? mapActions.clearSelection() : mapActions.selectContinent(c.id))}
            >
              <span>{c.name}</span>
              <span className={styles.count} title={`${counts[c.id].visited} von ${counts[c.id].total} Ländern besucht`}>
                {counts[c.id].visited}
                <small>/{counts[c.id].total}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
