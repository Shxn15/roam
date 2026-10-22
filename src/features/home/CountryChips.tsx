import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, type CSSProperties } from 'react';
import { useTravelStore } from '../../data/travelStore';
import { countriesByContinent } from '../../domain/countries';
import { continentName } from '../../geo/continents';
import { EASE_SOFT, useDurations } from '../../motion/useMotion';
import { IconButton } from '../../ui/IconButton';
import { cx } from '../../ui/cx';
import { useOpenCountry } from '../country/useOpenCountry';
import { mapActions, useMapStore } from '../map/mapStore';
import styles from './CountryChips.module.css';

/**
 * The countries of the chosen continent. Appears once the clouds clear (phase 3). A chip
 * sends the plane to its country; the country page opens when it lands.
 */
export function CountryChips() {
  const revealed = useMapStore((s) => s.revealed);
  const selected = useMapStore((s) => s.selected);
  const countries = useTravelStore((s) => s.countries);
  const groups = useMemo(() => countriesByContinent(countries), [countries]);
  const openCountry = useOpenCountry();
  const d = useDurations();
  const continent = revealed && revealed === selected ? revealed : null;
  const list = continent ? groups[continent] : [];
  const visited = list.filter((c) => c.visited).length;

  return (
    <AnimatePresence>
      {continent && (
        <motion.section
          key={continent}
          className={styles.panel}
          aria-label={`Länder in ${continentName(continent)}`}
          initial={{ opacity: 0, y: d.reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: d.slow, ease: EASE_SOFT }}
        >
          <header className={styles.header}>
            <div>
              <h2 className={styles.title}>{continentName(continent)}</h2>
              <p className={styles.meta}>
                {visited} von {list.length} besucht
              </p>
            </div>
            <IconButton size="sm" label="Kontinentauswahl aufheben (Esc)" icon={<X size={16} />} onClick={mapActions.clearSelection} />
          </header>
          <div className={styles.chips}>
            {list.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={cx(styles.chip, c.visited && styles.visited)}
                style={{ '--i': Math.min(i, 30) } as CSSProperties}
                data-opens-country=""
                onClick={() => openCountry(c.id)}
              >
                {c.visited && <Check size={13} strokeWidth={2.6} aria-label="besucht" />}
                {c.name}
              </button>
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
