import type { MotionPreference } from '../../motion/preference';
import { useMotionLevel } from '../../motion/useMotion';
import { useThemeStore } from '../../theme/themeStore';
import { Segmented } from '../../ui/Segmented';
import { FlightDemo } from './FlightDemo';
import styles from './MotionSettings.module.css';

const OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Wie System' },
  { value: 'reduced', label: 'Reduziert' },
  { value: 'full', label: 'Voll' },
];

export function MotionSettings() {
  const preference = useThemeStore((s) => s.motionPreference);
  const systemReduced = useThemeStore((s) => s.systemReducedMotion);
  const setPreference = useThemeStore((s) => s.setMotionPreference);
  const level = useMotionLevel();

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.head}>
          <h4>Bewegung reduzieren</h4>
          <p>
            Roam folgt standardmäßig deiner Systemeinstellung. Mit reduzierter Bewegung werden Flüge, Zooms und Pop-Effekte zu
            kurzen, ruhigen Überblendungen.
          </p>
        </div>
        <Segmented label="Bewegung" options={OPTIONS} value={preference} onChange={setPreference} />
        <dl className={styles.status}>
          <div>
            <dt>Systemeinstellung</dt>
            <dd>{systemReduced ? 'Bewegung reduzieren ist an' : 'Bewegung reduzieren ist aus'}</dd>
          </div>
          <div>
            <dt>Aktuell in Roam</dt>
            <dd>{level === 'reduced' ? 'Reduziert: sanfte Überblendungen' : 'Voll: ruhige Übergänge von 1,5–2 Sekunden'}</dd>
          </div>
        </dl>
      </section>
      <section className={styles.section}>
        <div className={styles.head}>
          <h4>Vorschau</h4>
          <p>So fühlt sich ein Übergang zu einem Land an. Der ausgearbeitete Flug folgt mit der Weltkarte.</p>
        </div>
        <FlightDemo />
      </section>
    </div>
  );
}
