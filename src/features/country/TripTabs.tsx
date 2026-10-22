import { Backpack, CalendarClock, Images, MapPinned, Wallet, type LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import type { TripSummary } from '../../domain/trips';
import { cx } from '../../ui/cx';
import { DayPlan } from '../dayplan/DayPlan';
import styles from './TripTabs.module.css';

export const TRIP_TABS = ['galerie', 'karte', 'tagesplan', 'packliste', 'budget'] as const;
export type TripTab = (typeof TRIP_TABS)[number];

export const isTripTab = (value: unknown): value is TripTab => TRIP_TABS.includes(value as TripTab);

const TABS: Record<TripTab, { label: string; icon: LucideIcon; soon?: { text: string; milestone: number } }> = {
  galerie: {
    label: 'Galerie',
    icon: Images,
    soon: { text: 'Eigene Bilder als Moodboard: hochladen, sortieren, mit einer Notiz pro Bild.', milestone: 6 },
  },
  karte: {
    label: 'Karte',
    icon: MapPinned,
    soon: { text: 'Orte als Marker – Foodspots, Aktivitäten, Unterkünfte – mit Kategorien; Liste und Karte bleiben synchron.', milestone: 6 },
  },
  tagesplan: { label: 'Tagesplan', icon: CalendarClock },
  packliste: {
    label: 'Packliste',
    icon: Backpack,
    soon: { text: 'Abhakbare Listen mit Kategorien und Vorlagen für wiederkehrende Reisen.', milestone: 5 },
  },
  budget: {
    label: 'Budget',
    icon: Wallet,
    soon: { text: 'Ausgaben mit Kategorie, Währung und Datum, Soll und Ist, fester Umrechnungskurs und CSV-Export.', milestone: 5 },
  },
};

interface TripTabsProps {
  trip: TripSummary;
  tab: TripTab;
  onTab(tab: TripTab): void;
}

/** The five areas of a trip. Only the day plan has content in this step. */
export function TripTabs({ trip, tab, onTab }: TripTabsProps) {
  const list = useRef<HTMLDivElement>(null);
  const idFor = (t: TripTab) => `trip-tab-${t}`;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TRIP_TABS.indexOf(tab);
    const next =
      e.key === 'ArrowRight' ? (index + 1) % TRIP_TABS.length
      : e.key === 'ArrowLeft' ? (index - 1 + TRIP_TABS.length) % TRIP_TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TRIP_TABS.length - 1
      : null;
    if (next === null) return;
    e.preventDefault(); // the map must not pan as well
    const target = TRIP_TABS[next]!;
    onTab(target);
    list.current?.querySelector<HTMLButtonElement>(`#${idFor(target)}`)?.focus();
  };

  const current = TABS[tab];
  return (
    <div className={styles.tabs}>
      <div ref={list} role="tablist" aria-label={`Bereiche von „${trip.title}“`} className={styles.list} onKeyDown={onKeyDown}>
        {TRIP_TABS.map((t) => {
          const { label, icon: Icon, soon } = TABS[t];
          const selected = t === tab;
          return (
            <button
              key={t}
              id={idFor(t)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="trip-tab-panel"
              tabIndex={selected ? 0 : -1}
              className={cx(styles.tab, selected && styles.selected, soon && styles.soon)}
              onClick={() => onTab(t)}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <div id="trip-tab-panel" role="tabpanel" aria-labelledby={idFor(tab)} className={styles.panel}>
        {current.soon ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>
              <current.icon size={26} aria-hidden />
            </span>
            <h2 className={styles.placeholderTitle}>{current.label} kommt bald</h2>
            <p className={styles.placeholderText}>{current.soon.text}</p>
            <p className={styles.placeholderNote}>Geplant für Meilenstein {current.soon.milestone}. Der Tagesplan funktioniert schon.</p>
          </div>
        ) : (
          <DayPlan trip={trip} />
        )}
      </div>
    </div>
  );
}
