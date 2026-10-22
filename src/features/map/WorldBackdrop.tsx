import { useMemo, useRef } from 'react';
import { worldPaths, type Insets } from '../../geo/world';
import { cx } from '../../ui/cx';
import { useElementSize } from './useElementSize';
import styles from './WorldBackdrop.module.css';

interface WorldBackdropProps {
  insets: Insets;
  className?: string;
}

/** The world map behind the floating panels. Static in milestone 1. */
export function WorldBackdrop({ insets, className }: WorldBackdropProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const paths = useMemo(
    () => (width && height ? worldPaths(width, height, insets) : null),
    [width, height, insets],
  );

  return (
    <div ref={ref} className={cx(styles.backdrop, className)} aria-hidden="true">
      {paths && (
        <svg width={width} height={height}>
          <path className={styles.sphere} d={paths.sphere} />
          <path className={styles.graticule} d={paths.graticule} />
          <path className={styles.land} d={paths.land} />
        </svg>
      )}
    </div>
  );
}
