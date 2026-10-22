import { worldPaths, type WorldPaths } from '../../geo/world';
import styles from './MiniWorld.module.css';

const cache = new Map<string, WorldPaths>();
const PAD = { top: 2, right: 2, bottom: 2, left: 2 };

/** A small static world for previews. Colors come from the surrounding theme tokens. */
export function MiniWorld({ width, height, className }: { width: number; height: number; className?: string }) {
  const key = `${width}x${height}`;
  let paths = cache.get(key);
  if (!paths) {
    paths = worldPaths(width, height, PAD);
    cache.set(key, paths);
  }
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path className={styles.land} d={paths.land} />
    </svg>
  );
}
