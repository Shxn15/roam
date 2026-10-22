import { Check, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { scopedThemeStyle } from '../../theme/scoped';
import { appearanceOf } from '../../theme/derive';
import type { ThemeRecord } from '../../theme/types';
import { IconButton } from '../../ui/IconButton';
import { cx } from '../../ui/cx';
import { MiniWorld } from '../map/MiniWorld';
import styles from './ThemeCard.module.css';

interface ThemeCardProps {
  theme: ThemeRecord;
  selected: boolean;
  onSelect(): void;
  onDelete?(): void;
}

/** A miniature of the floating layout, rendered in the card's own theme. */
export function ThemeCard({ theme, selected, onSelect, onDelete }: ThemeCardProps) {
  const style = useMemo(() => scopedThemeStyle(theme), [theme]);
  return (
    <div className={cx(styles.card, selected && styles.selected)}>
      <button type="button" className={styles.select} aria-pressed={selected} onClick={onSelect}>
        <span className={styles.scene} style={style} data-appearance={appearanceOf(theme)}>
          <MiniWorld width={160} height={96} className={styles.world} />
          <span className={styles.pin} />
          <span className={styles.panel}>
            <span className={styles.sample}>Aa</span>
            <span className={styles.line} />
            <span className={styles.tints}>
              {[1, 2, 3, 4].map((i) => (
                <i key={i} style={{ background: `var(--tint-${i})` }} />
              ))}
            </span>
            <span className={styles.button}>Los</span>
          </span>
        </span>
        <span className={styles.name}>{theme.name}</span>
      </button>
      {selected && (
        <span className={styles.check} aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      {onDelete && (
        <IconButton
          size="sm"
          label={`„${theme.name}“ löschen`}
          icon={<Trash2 size={14} />}
          className={styles.delete}
          onClick={onDelete}
        />
      )}
    </div>
  );
}
