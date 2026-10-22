import type { CSSProperties } from 'react';
import { TRIP_STATUS_LABELS, TRIP_STATUS_TINT, type TripStatus } from '../domain/tripStatus';
import styles from './StatusChip.module.css';

export function StatusChip({ status }: { status: TripStatus }) {
  const tint = TRIP_STATUS_TINT[status];
  return (
    <span
      className={styles.chip}
      style={{ background: `var(--tint-${tint})`, '--dot': `var(--tint-${tint}-strong)` } as CSSProperties}
    >
      <span className={styles.dot} aria-hidden />
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}
