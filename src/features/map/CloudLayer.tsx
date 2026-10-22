import { useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react';
import { smoothstep } from './camera';
import { makeClouds, placeCloud, type Cloud } from './clouds';
import { CONTINENT_TRANSITION } from './transition';
import styles from './CloudLayer.module.css';

export interface CloudLayerHandle {
  /** Positions every cloud for the given cover (0..1). Called once per animation frame. */
  update(cover: number, width: number, height: number, timeMs: number): void;
}

/**
 * Cloud shapes as alpha masks (SVG with blur), built once. Their color comes from CSS custom
 * properties on the masked elements, so a theme switch changes only variables and the masks,
 * rasterized once, are only moved during the transition.
 */
function mask(puffs: string, blur: number, dy = 0): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 240 176" preserveAspectRatio="none"><filter id="b" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter><g filter="url(#b)" fill="white" transform="translate(0 ${dy})">${puffs}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

function cloudMasks(cloud: Cloud) {
  const puffs = (dy: number, scale: number) =>
    cloud.puffs.map((p) => `<circle cx="${p.cx}" cy="${(p.cy + p.r * dy).toFixed(1)}" r="${(p.r * scale).toFixed(1)}"/>`).join('');
  const style = (image: string): CSSProperties => ({ WebkitMaskImage: image, maskImage: image });
  return {
    shade: style(mask(puffs(0, 1), 11, 10)),
    body: style(mask(puffs(0, 1), 3.5)),
    belly: style(mask(puffs(0.45, 0.62), 6)),
  };
}

const CLOUDS = makeClouds(CONTINENT_TRANSITION.cloudCount);
const MASKS = CLOUDS.map(cloudMasks);

/** Soft 2D clouds above the map. */
export function CloudLayer({ ref }: { ref?: Ref<CloudLayerHandle> }) {
  const layer = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const sized = useRef('');

  useImperativeHandle(ref, () => ({
    update(cover, width, height, timeMs) {
      if (!layer.current || !veil.current) return;
      const visible = cover > 0.002;
      layer.current.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) return;
      // Haze behind the clouds closes the last gaps once they are mostly in, so the cover
      // is nearly complete mid-way while the clouds still read as clouds on the way in.
      veil.current.style.opacity = (smoothstep(0.45, 1, cover) * 0.82).toFixed(3);
      const resize = sized.current !== `${width}x${height}`;
      sized.current = `${width}x${height}`;
      CLOUDS.forEach((cloud, i) => {
        const node = nodes.current[i];
        if (!node) return;
        const p = placeCloud(cloud, cover, width, height, timeMs);
        if (resize) {
          node.style.width = `${p.width}px`;
          node.style.height = `${p.height}px`;
        }
        node.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      });
    },
  }));

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      <div ref={veil} className={styles.veil} />
      {MASKS.map((m, i) => (
        <div
          key={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
          className={styles.cloud}
        >
          <span className={styles.shade} style={m.shade} />
          <span className={styles.body} style={m.body} />
          <span className={styles.belly} style={m.belly} />
        </div>
      ))}
    </div>
  );
}
