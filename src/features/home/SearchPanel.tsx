import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useUi } from '../../app/uiStore';
import { Logo } from '../../brand/Logo';
import { useTravelStore } from '../../data/travelStore';
import { searchCountries } from '../../domain/countries';
import { continentName } from '../../geo/continents';
import { Panel } from '../../ui/Panel';
import { cx } from '../../ui/cx';
import { useOpenCountry } from '../country/useOpenCountry';
import styles from './SearchPanel.module.css';

export function SearchPanel() {
  const countries = useTravelStore((s) => s.countries);
  const openCountry = useOpenCountry();
  const newTrip = useUi((s) => s.newTripIntent);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => searchCountries(countries, query, 7), [countries, query]);

  // "Neue Reise" on the home screen starts here: first the country.
  useEffect(() => {
    if (newTrip) input.current?.focus();
  }, [newTrip]);

  const open = (id: string) => {
    setQuery('');
    openCountry(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      open(results[active].id);
    } else if (e.key === 'Escape' && (query || newTrip)) {
      e.preventDefault(); // keep the map's Escape for the continent
      setQuery('');
      useUi.getState().setNewTripIntent(false);
    }
  };

  return (
    <Panel padded={false} className={styles.panel}>
      <div className={styles.brand}>
        <Logo size={26} />
      </div>
      <div className={styles.field}>
        <Search size={16} aria-hidden className={styles.icon} />
        <input
          ref={input}
          type="text"
          value={query}
          placeholder={newTrip ? 'Wohin geht die neue Reise?' : 'Land suchen'}
          aria-label="Land suchen"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button type="button" className={styles.clear} aria-label="Suche leeren" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>
      {query.trim() && (
        <ul id={listId} role="listbox" className={styles.results} aria-label="Treffer">
          {results.length === 0 && <li className={styles.empty}>Kein Land gefunden</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${c.id}`}
              role="option"
              aria-selected={i === active}
              className={cx(styles.result, i === active && styles.activeResult)}
              data-opens-country=""
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => open(c.id)}
            >
              <span>{c.name}</span>
              <small>{continentName(c.continent)}</small>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
