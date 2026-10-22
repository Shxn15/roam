import { worldPaths } from '../../geo/world';
import { cx } from '../../ui/cx';
import styles from './MiniWorld.module.css';

const masks = new Map<string, string>();
const PAD = { top: 2, right: 2, bottom: 2, left: 2 };

/** The land as an alpha mask, built once per size: the browser rasterizes it a single time. */
function landMask(width: number, height: number): string {
  const key = `${width}x${height}`;
  let image = masks.get(key);
  if (!image) {
    const { land } = worldPaths(width, height, PAD);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="white" d="${land}"/></svg>`;
    image = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
    masks.set(key, image);
  }
  return image;
}

/**
 * A small static world for previews. The land color comes from the surrounding theme
 * tokens (--map-land), so a theme switch only recolors it and never redraws the outline.
 */
export function MiniWorld({ width, height, className }: { width: number; height: number; className?: string }) {
  const image = landMask(width, height);
  return <div className={cx(styles.world, className)} style={{ WebkitMaskImage: image, maskImage: image }} aria-hidden="true" />;
}
