import { MapPin, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { CATEGORY_LABELS, CATEGORY_TINT, formatTimeSpan, type TimeBlock } from '../../domain/dayPlan';
import { IconButton } from '../../ui/IconButton';
import { cx } from '../../ui/cx';
import { CATEGORY_ICONS } from './categories';
import { listTitles } from './format';
import styles from './TimeBlockCard.module.css';

interface TimeBlockCardProps {
  block: TimeBlock;
  /** The blocks this one overlaps, in time order. */
  clashes: TimeBlock[];
  onEdit(): void;
  onDelete(): void;
}

/** One time block. Overlaps show as a warning on both blocks; nothing is refused. */
export function TimeBlockCard({ block, clashes, onEdit, onDelete }: TimeBlockCardProps) {
  const [confirming, setConfirming] = useState(false);
  const Icon = CATEGORY_ICONS[block.category];
  const tint = CATEGORY_TINT[block.category];

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <article className={cx(styles.block, clashes.length > 0 && styles.clashing)} aria-label={`${formatTimeSpan(block)} ${block.title}`}>
      <div className={styles.time}>
        <span className={styles.start}>{block.startTime}</span>
        <span className={styles.end}>{block.endTime ? `bis ${block.endTime}` : 'ohne Ende'}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span
            className={styles.category}
            style={{ background: `var(--tint-${tint})`, '--icon': `var(--tint-${tint}-strong)` } as CSSProperties}
          >
            <Icon size={13} aria-hidden />
            {CATEGORY_LABELS[block.category]}
          </span>
          <h3 className={styles.title}>{block.title}</h3>
        </div>
        {block.location && (
          <p className={styles.location}>
            <MapPin size={13} aria-hidden /> {block.location}
          </p>
        )}
        {block.note && <p className={styles.note}>{block.note}</p>}
        {clashes.length > 0 && (
          <p className={styles.warning}>
            <TriangleAlert size={14} aria-hidden />
            Überschneidet sich mit {listTitles(clashes.map((c) => `${c.title}`))} ({clashes.map(formatTimeSpan).join(', ')})
          </p>
        )}
      </div>
      <div className={styles.actions}>
        {confirming ? (
          <>
            <button type="button" className={styles.confirm} onClick={onDelete}>
              Löschen?
            </button>
            <button type="button" className={styles.keep} onClick={() => setConfirming(false)}>
              Nein
            </button>
          </>
        ) : (
          <>
            <IconButton size="sm" label={`„${block.title}“ bearbeiten`} icon={<Pencil size={14} />} onClick={onEdit} />
            <IconButton size="sm" label={`„${block.title}“ löschen`} icon={<Trash2 size={14} />} onClick={() => setConfirming(true)} />
          </>
        )}
      </div>
    </article>
  );
}
