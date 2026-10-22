import { ArrowLeft, Check, MapPinCheck, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTravelStore } from '../../data/travelStore';
import type { Country } from '../../domain/countries';
import { continentName } from '../../geo/continents';
import { countryTheme } from '../../theme/countryTheme';
import { Switch } from '../../ui/Switch';
import { reportError } from '../../ui/toast';
import { CountryPattern } from './CountryPattern';
import styles from './CountryHeader.module.css';

const tripsLabel = (n: number) => (n === 0 ? 'noch keine Reise' : n === 1 ? '1 Reise' : `${n} Reisen`);

/** Name, continent, number of trips and visit status, on the country's pattern. */
export function CountryHeader({ country, tripCount }: { country: Country; tripCount: number }) {
  const navigate = useNavigate();
  const setVisited = useTravelStore((s) => s.setVisited);
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState('');
  const theme = countryTheme(country.id);

  useEffect(() => setYear(country.visitedYear ? String(country.visitedYear) : ''), [country.visitedYear]);
  useEffect(() => setEditing(false), [country.id]);

  const thisYear = new Date().getFullYear();
  const saveVisit = (visited: boolean, rawYear: string) => {
    const parsed = Number.parseInt(rawYear, 10);
    const validYear = parsed >= 1900 && parsed <= thisYear ? parsed : null;
    void setVisited(country.id, visited, validYear).catch(reportError('Besuch konnte nicht gespeichert werden'));
  };

  const visitLabel = country.visited ? (country.visitedYear ? `besucht ${country.visitedYear}` : 'besucht') : 'noch nicht besucht';

  return (
    <header className={styles.header}>
      <CountryPattern countryId={country.id} />
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden /> Weltkarte
        </button>
        <button
          type="button"
          className={styles.visit}
          data-visited={country.visited || undefined}
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          title="Besuchsstatus ändern"
        >
          {country.visited ? <MapPinCheck size={15} aria-hidden /> : <MapPin size={15} aria-hidden />}
          {visitLabel}
        </button>
      </div>
      <p className={styles.kicker}>
        {continentName(country.continent)}
        <span aria-hidden>·</span>
        {tripsLabel(tripCount)}
      </p>
      <h1 className={styles.title}>{country.name}</h1>
      {theme && <span className="visually-hidden">Muster im Hintergrund: {theme.patternLabel}</span>}

      {editing && (
        <div className={styles.editor}>
          <span className={styles.editorLabel}>Schon dort gewesen</span>
          <Switch label="Besucht" checked={country.visited} onChange={(v) => saveVisit(v, year)} />
          {country.visited && (
            <label className={styles.year}>
              <span>Jahr</span>
              <input
                inputMode="numeric"
                placeholder={String(thisYear)}
                value={year}
                maxLength={4}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                onBlur={() => saveVisit(true, year)}
                onKeyDown={(e) => e.key === 'Enter' && saveVisit(true, year)}
              />
              {country.visitedYear && <Check size={14} aria-label="gespeichert" />}
            </label>
          )}
          <button type="button" className={styles.done} onClick={() => setEditing(false)}>
            Fertig
          </button>
        </div>
      )}
    </header>
  );
}
