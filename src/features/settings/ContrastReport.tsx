import { Check, TriangleAlert, Wand2 } from 'lucide-react';
import { checkContrast, fixContrast } from '../../theme/contrast';
import { effectiveTheme, useThemeStore } from '../../theme/themeStore';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import styles from './ContrastReport.module.css';

const formatRatio = (ratio: number) => `${ratio.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} : 1`;

export function ContrastReport() {
  const theme = useThemeStore(effectiveTheme);
  const replaceDraft = useThemeStore((s) => s.replaceDraft);
  const results = checkContrast(theme);
  const failing = results.filter((r) => !r.pass);

  return (
    <section className={styles.report} aria-labelledby="contrast-title">
      <div className={styles.head}>
        <h4 id="contrast-title">Kontrast</h4>
        {failing.length === 0 ? (
          <span className={cx(styles.summary, styles.ok)}>
            <Check size={14} aria-hidden /> Alles gut lesbar
          </span>
        ) : (
          <span className={cx(styles.summary, styles.warn)}>
            <TriangleAlert size={14} aria-hidden /> {failing.length === 1 ? '1 Paar zu schwach' : `${failing.length} Paare zu schwach`}
          </span>
        )}
      </div>
      <ul className={styles.list}>
        {results.map((r) => (
          <li key={r.id} className={styles.item}>
            <span className={styles.sample} style={{ color: theme.colors[r.fg], background: theme.colors[r.bg] }} aria-hidden>
              Aa
            </span>
            <span className={styles.label}>
              {r.label}
              <small>mind. {formatRatio(r.min)}</small>
            </span>
            <span className={cx(styles.ratio, r.pass ? styles.pass : styles.fail)}>{formatRatio(r.ratio)}</span>
            {!r.pass && (
              <Button size="sm" variant="secondary" icon={<Wand2 size={14} />} onClick={() => replaceDraft(fixContrast(theme, r.id))}>
                Anpassen
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Richtwert nach WCAG AA: 4,5 : 1 für Text, 3 : 1 für Akzente wie aktive Tabs und Markierungen. „Anpassen“ verändert nur
        die Schrift- bzw. Akzentfarbe, nie den Hintergrund.
      </p>
    </section>
  );
}
