import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Panel.module.css';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'sm' | 'md' | 'lg';
  padded?: boolean;
}

/** A floating white surface in the maps style. */
export function Panel({ elevation = 'md', padded = true, className, ...rest }: PanelProps) {
  return <div className={cx(styles.panel, styles[elevation], padded && styles.padded, className)} {...rest} />;
}
