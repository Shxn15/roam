import { PLANE_PATH } from './plane';
import styles from './Logo.module.css';

/** The Roam wordmark: chunky rounded letters and a plane taking off on a dotted loop. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className={styles.logo} style={{ fontSize: size }} role="img" aria-label="Roam">
      <span className={styles.word} aria-hidden="true">
        Roam
      </span>
      <svg className={styles.flight} viewBox="0 0 58 46" aria-hidden="true">
        <path className={styles.trail} d="M2 42 C 14 42, 23 36, 22 27 C 21 19, 10 20, 12 27.5 C 14 35, 29 33, 38 21" />
        <g transform="translate(46 12) rotate(42) scale(0.78) translate(-12 -12)">
          <path className={styles.plane} d={PLANE_PATH} />
        </g>
      </svg>
    </span>
  );
}
