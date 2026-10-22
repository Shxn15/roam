import { ArrowLeft, CalendarDays, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { COUNTRY_MAP_INSETS } from '../../app/layout';
import { useTravelStore } from '../../data/travelStore';
import { todayIso } from '../../domain/trips';
import { continentName } from '../../geo/continents';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { StatusChip } from '../../ui/StatusChip';
import { Switch } from '../../ui/Switch';
import { reportError } from '../../ui/toast';
import { mapActions } from '../map/mapStore';
import styles from './CountryPage.module.css';

/**
 * Placeholder for the country tab (step 3: trips with gallery, map, day plan, …).
 * It already frames the country on the map and records visits.
 */
export function CountryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const country = useTravelStore((s) => s.countries.find((c) => c.id === id));
  const trips = useTravelStore((s) => s.trips).filter((t) => t.countryId === id);
  const setVisited = useTravelStore((s) => s.setVisited);
  const [year, setYear] = useState('');

  useEffect(() => setYear(country?.visitedYear ? String(country.visitedYear) : ''), [country?.visitedYear]);

  useEffect(() => {
    mapActions.focusCountry(id, COUNTRY_MAP_INSETS);
    return () => mapActions.releaseCountry();
  }, [id]);

  if (!country) {
    return (
      <div className={styles.page}>
        <Panel elevation="lg" className={styles.panel}>
          <p>Dieses Land gibt es nicht.</p>
          <Button onClick={() => navigate('/')}>Zur Weltkarte</Button>
        </Panel>
      </div>
    );
  }

  const thisYear = new Date().getFullYear();
  const saveVisit = (visited: boolean, rawYear: string) => {
    const parsed = Number.parseInt(rawYear, 10);
    const validYear = parsed >= 1900 && parsed <= thisYear ? parsed : null;
    void setVisited(country.id, visited, validYear).catch(reportError('Besuch konnte nicht gespeichert werden'));
  };

  return (
    <div className={styles.page}>
      <Panel elevation="lg" className={styles.panel}>
        <button type="button" className={styles.back} onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden /> Weltkarte
        </button>
        <header className={styles.header}>
          <p className={styles.kicker}>
            {continentName(country.continent)}
            {country.isoCode && <span className={styles.iso}>{country.isoCode}</span>}
          </p>
          <h1 className={styles.title}>{country.name}</h1>
        </header>

        <section className={styles.section}>
          <div className={styles.row}>
            <div>
              <h2 className={styles.sectionTitle}>Schon dort gewesen</h2>
              <p className={styles.hint}>Besuchte Länder sind auf der Karte dauerhaft eingefärbt.</p>
            </div>
            <Switch label="Besucht" checked={country.visited} onChange={(v) => saveVisit(v, year)} />
          </div>
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
              />
              {country.visitedYear && <Check size={14} aria-label="gespeichert" />}
            </label>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reisen</h2>
          {trips.length === 0 ? (
            <p className={styles.hint}>
              Noch keine Reise nach {country.name}. Reisen anlegen – mit Tagen, Status und eigenen Tabs – kommt in Schritt 3.
            </p>
          ) : (
            <ul className={styles.trips}>
              {trips.map((t) => (
                <li key={t.id} className={styles.trip}>
                  <span className={styles.tripTitle}>{t.title}</span>
                  <StatusChip status={t.status} />
                  <span className={styles.tripDays}>
                    <CalendarDays size={13} aria-hidden /> {t.days} {t.days === 1 ? 'Tag' : 'Tage'}
                    {t.startDate && t.startDate < todayIso() && t.status === 'done' ? ' · vergangen' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Panel>
    </div>
  );
}
