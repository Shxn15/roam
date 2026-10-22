import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { deriveColorTokens } from '../../theme/derive';
import { effectiveTheme, useThemeStore } from '../../theme/themeStore';
import { smoothstep } from './camera';
import { makeClouds, placeCloud, type Cloud } from './clouds';
import { CONTINENT_TRANSITION } from './transition';
import styles from './CloudLayer.module.css';

export interface CloudLayerHandle {
  /** Positions every cloud for the given cover (0..1). Called once per animation frame. */
  update(cover: number, width: number, height: number, timeMs: number): void;
}

interface CloudColors {
  body: string;
  belly: string;
  shade: string;
}

/**
 * One cloud as a self-contained SVG image: soft puffs (blur + drop shadow) and a darker
 * underside. As an <img> the browser rasterizes the filters once; afterwards the cloud is
 * only moved, which keeps the transition smooth even without a GPU.
 */
function cloudImage(cloud: Cloud, c: CloudColors): string {
  const puffs = (dy: number, scale: number) =>
    cloud.puffs.map((p) => `<circle cx="${p.cx}" cy="${(p.cy + p.r * dy).toFixed(1)}" r="${(p.r * scale).toFixed(1)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 240 176" preserveAspectRatio="none">
<defs>
<filter id="s" x="-25%" y="-45%" width="150%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="soft"/><feDropShadow in="soft" dx="0" dy="10" stdDeviation="11" flood-color="${c.shade}" flood-opacity="0.5"/></filter>
<filter id="b" x="-25%" y="-45%" width="150%" height="190%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<g filter="url(#s)" fill="${c.body}">${puffs(0, 1)}</g>
<g filter="url(#b)" fill="${c.belly}" opacity="0.5" style="mix-blend-mode:multiply">${puffs(0.45, 0.62)}</g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Soft 2D clouds above the map, in the colors of the current theme. */
export function CloudLayer({ ref }: { ref?: Ref<CloudLayerHandle> }) {
  const clouds = useMemo(() => makeClouds(CONTINENT_TRANSITION.cloudCount), []);
  const theme = useThemeStore(effectiveTheme);
  const images = useMemo(() => {
    const t = deriveColorTokens(theme);
    const colors = { body: t['--cloud']!, belly: t['--cloud-belly']!, shade: t['--cloud-shade']! };
    return clouds.map((cloud) => cloudImage(cloud, colors));
  }, [clouds, theme]);
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
      clouds.forEach((cloud, i) => {
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
      {images.map((src, i) => (
        <div
          key={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
          className={styles.cloud}
        >
          <img src={src} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}
