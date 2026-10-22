import { CalendarDays, Search } from 'lucide-react';
import { Button } from '../../ui/Button';
import { ProgressBar } from '../../ui/ProgressBar';
import { StatusChip } from '../../ui/StatusChip';
import { MiniWorld } from '../map/MiniWorld';
import styles from './ThemePreview.module.css';

/** A live miniature of the home screen, drawn with the theme currently being edited. */
export function ThemePreview() {
  return (
    <figure className={styles.preview} aria-label="Live-Vorschau">
      <MiniWorld width={440} height={250} className={styles.world} />
      <span className={styles.pin} />
      <div className={styles.search}>
        <Search size={13} aria-hidden />
        Japan
      </div>
      <ul className={styles.continents}>
        <li>Afrika</li>
        <li className={styles.current}>Asien</li>
        <li>Europa</li>
      </ul>
      <div className={styles.trip}>
        <div className={styles.tripHead}>
          <strong>Japan Herbst</strong>
          <StatusChip status="planned" />
        </div>
        <ProgressBar value={0.6} label="Planungsfortschritt" />
        <div className={styles.tripFoot}>
          <span>
            <CalendarDays size={13} aria-hidden /> 12 Tage
          </span>
          <Button size="sm" variant="primary">
            Öffnen
          </Button>
        </div>
      </div>
      <div className={styles.chips}>
        <StatusChip status="idea" />
        <StatusChip status="traveling" />
        <StatusChip status="done" />
      </div>
      <figcaption className="visually-hidden">Vorschau der Startseite im aktuellen Theme</figcaption>
    </figure>
  );
}
