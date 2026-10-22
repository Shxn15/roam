import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { countryMapInsets, countryPanelWidth } from '../../app/layout';
import { useTravelStore } from '../../data/travelStore';
import { todayIso } from '../../domain/trips';
import { EASE_SOFT, useDurations } from '../../motion/useMotion';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { mapActions } from '../map/mapStore';
import { NewTripDialog } from '../trips/NewTripDialog';
import { CountryHeader } from './CountryHeader';
import { TripStrip } from './TripStrip';
import { TripTabs, isTripTab, type TripTab } from './TripTabs';
import styles from './CountryPage.module.css';

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

/**
 * The country tab: header with the country's theme, its trips (several per country), and the
 * tabs of the chosen trip. The map frames the country to the right. Trip, tab and day live in
 * the URL (`?reise=…&tab=…&tag=…`), so going back and forth keeps the place.
 */
export function CountryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const country = useTravelStore((s) => s.countries.find((c) => c.id === id));
  const allTrips = useTravelStore((s) => s.trips);
  const trips = useMemo(() => allTrips.filter((t) => t.countryId === id), [allTrips, id]);
  const width = useViewportWidth();
  const d = useDurations();
  const [creating, setCreating] = useState(false);
  const firstWidth = useRef(true);

  useEffect(() => {
    mapActions.focusCountry(id, countryMapInsets(window.innerWidth));
    return () => mapActions.releaseCountry();
  }, [id]);

  // A resized window moves the free strip of map; frame the country there again.
  useEffect(() => {
    if (firstWidth.current) {
      firstWidth.current = false;
      return;
    }
    mapActions.focusCountry(id, countryMapInsets(width));
  }, [width, id]);

  // "Neue Reise" on the home screen arrives here with ?neu=1.
  useEffect(() => {
    if (params.get('neu') !== '1') return;
    setCreating(true);
    setParams(
      (p) => {
        p.delete('neu');
        return p;
      },
      { replace: true },
    );
  }, [params, setParams]);

  const asked = params.get('reise');
  const trip = trips.find((t) => t.id === asked) ?? trips[0] ?? null;
  const rawTab = params.get('tab');
  const tab: TripTab = isTripTab(rawTab) ? rawTab : 'tagesplan';

  const show = (patch: { reise?: string; tab?: TripTab }) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (patch.reise && patch.reise !== next.get('reise')) {
        next.set('reise', patch.reise);
        next.delete('tag');
      }
      if (patch.tab) next.set('tab', patch.tab);
      return next;
    });

  if (!country) {
    return (
      <div className={styles.page} style={{ width: countryPanelWidth(width) }}>
        <Panel elevation="lg" className={styles.missing}>
          <p>Dieses Land gibt es nicht.</p>
          <Button onClick={() => navigate('/')}>Zur Weltkarte</Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ width: countryPanelWidth(width) }} data-country-theme={country.id} data-keeps-keys="">
      <motion.div
        key={country.id}
        className={styles.panel}
        initial={{ opacity: 0, x: d.reduced ? 0 : -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: d.slow, ease: EASE_SOFT }}
      >
        <CountryHeader country={country} tripCount={trips.length} />
        {trips.length > 0 && (
          <TripStrip trips={trips} selectedId={trip?.id ?? null} today={todayIso()} onSelect={(reise) => show({ reise })} onNew={() => setCreating(true)} />
        )}
        {trip ? (
          <TripTabs trip={trip} tab={tab} onTab={(t) => show({ tab: t })} />
        ) : (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>Noch keine Reise</h2>
            <p className={styles.emptyText}>
              Eine Reise ist ein Projekt mit eigenem Tagesplan, später auch mit Galerie, Karte, Packliste und Budget. Leg so viele an, wie du
              magst – „{country.name} Herbst“ und „{country.name} Winter“ dürfen nebeneinander stehen.
            </p>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Neue Reise
            </Button>
          </div>
        )}
      </motion.div>
      <NewTripDialog
        open={creating}
        country={country}
        onClose={() => setCreating(false)}
        onCreated={(reise) => {
          setCreating(false);
          show({ reise, tab: 'tagesplan' });
        }}
      />
    </div>
  );
}
