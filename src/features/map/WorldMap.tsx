import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { HOME_MAP_INSETS } from '../../app/layout';
import { useUi } from '../../app/uiStore';
import { PLANE_PATH } from '../../brand/plane';
import { useTravelStore } from '../../data/travelStore';
import { ATLAS, GRATICULE_PATH, SPHERE_PATH, atlasCountry, type AtlasCountry } from '../../geo/atlas';
import { CONTINENT_IDS, type ContinentId } from '../../geo/continents';
import { useMotionLevel } from '../../motion/useMotion';
import { cx } from '../../ui/cx';
import { mapToScreen, type Viewport } from './camera';
import { CloudLayer, type CloudLayerHandle } from './CloudLayer';
import { MapController } from './controller';
import { attachMap, mapActions, useMapStore } from './mapStore';
import { headingAt, pointAt, transformRoute } from './route';
import type { TransitionFrame } from './transition';
import { useElementSize } from './useElementSize';
import styles from './WorldMap.module.css';

const BY_CONTINENT = CONTINENT_IDS.map((id) => ({ id, countries: ATLAS.countries.filter((c) => c.continent === id) }));
const PAN_STEP = 90;

function routeSvgPath(r: { from: readonly number[]; control: readonly number[]; to: readonly number[] }): string {
  const f = (n: number | undefined) => (n ?? 0).toFixed(1);
  return `M${f(r.from[0])} ${f(r.from[1])}Q${f(r.control[0])} ${f(r.control[1])} ${f(r.to[0])} ${f(r.to[1])}`;
}

/**
 * The full-screen world map. Four layers: the map itself (moved by one transform),
 * the flight route with the plane, the clouds, and a name tooltip.
 */
export function WorldMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapSvg = useRef<SVGSVGElement>(null);
  const cameraGroup = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const trailMask = useRef<SVGPathElement>(null);
  const plane = useRef<SVGGElement>(null);
  const clouds = useRef<CloudLayerHandle>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const controller = useRef<MapController | null>(null);
  const frameRequest = useRef(0);
  const size = useElementSize(container);
  const motion = useMotionLevel();
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const navigate = useNavigate();
  const location = useLocation();
  const selected = useMapStore((s) => s.selected);
  const focused = useMapStore((s) => s.focusedCountry);
  const countries = useTravelStore((s) => s.countries);
  const visited = useMemo(() => new Set(countries.filter((c) => c.visited).map((c) => c.id)), [countries]);

  const draw = useCallback((frame: TransitionFrame, now: number) => {
    const ctrl = controller.current;
    const g = cameraGroup.current;
    if (!ctrl || !g || !container.current) return;
    const { x, y, k } = frame.camera;
    g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})`);
    g.style.setProperty('--k', k.toFixed(5));
    if (mapSvg.current) mapSvg.current.style.opacity = frame.mapOpacity < 1 ? frame.mapOpacity.toFixed(3) : '';
    clouds.current?.update(frame.cover, container.current.clientWidth, container.current.clientHeight, now);

    const route = ctrl.transition?.route;
    if (route && trail.current && trailMask.current && plane.current) {
      const screen = transformRoute(route, (p) => mapToScreen(frame.camera, p));
      const d = routeSvgPath(screen);
      trail.current.setAttribute('d', d);
      trailMask.current.setAttribute('d', d);
      // The dashed line is revealed up to the plane: a solid mask stroke grows via stroke-dashoffset.
      trailMask.current.style.strokeDashoffset = (1 - frame.flight).toFixed(4);
      trail.current.style.opacity = frame.trailOpacity.toFixed(3);
      const [px, py] = pointAt(screen, frame.flight);
      const heading = headingAt(screen, Math.min(frame.flight, 0.999));
      plane.current.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(heading + 90).toFixed(1)}) scale(1.3) translate(-12 -12)`);
      plane.current.style.opacity = frame.planeOpacity.toFixed(3);
    } else {
      if (trail.current) trail.current.style.opacity = '0';
      if (plane.current) plane.current.style.opacity = '0';
    }
  }, []);

  const requestFrame = useCallback(() => {
    if (frameRequest.current) return;
    const step = (now: number) => {
      frameRequest.current = 0;
      const ctrl = controller.current;
      if (!ctrl) return;
      draw(ctrl.tick(now), now);
      if (ctrl.transition) frameRequest.current = requestAnimationFrame(step);
    };
    frameRequest.current = requestAnimationFrame(step);
  }, [draw]);

  // Create the controller once the size is known; keep it in sync with resizes.
  useLayoutEffect(() => {
    if (!size.width || !size.height) return;
    const viewport: Viewport = { width: size.width, height: size.height, insets: HOME_MAP_INSETS };
    if (!controller.current) {
      controller.current = new MapController(viewport, () => motionRef.current, {
        onSelect: (continent) => useMapStore.setState({ selected: continent }),
        onReveal: (continent) => useMapStore.setState({ revealed: continent }),
      });
    } else {
      controller.current.setViewport(viewport);
    }
    draw(controller.current.frameAt(performance.now()), performance.now());
    requestFrame();
  }, [size.width, size.height, draw, requestFrame]);

  useEffect(() => {
    if (!controller.current) return;
    return attachMap(controller.current, requestFrame);
  }, [requestFrame, size.width > 0]);

  useEffect(() => () => cancelAnimationFrame(frameRequest.current), []);

  const openCountry = useCallback(
    (id: string) => {
      const country = atlasCountry(id);
      if (!country) return;
      const onCountryPage = location.pathname.startsWith('/land/');
      if (!onCountryPage && useMapStore.getState().selected !== country.continent) {
        mapActions.selectContinent(country.continent);
      } else {
        navigate(`/land/${id}`);
      }
    },
    [location.pathname, navigate],
  );

  // Keyboard: arrows pan, +/- zoom, Escape leaves the country page or the continent.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUi.getState().settingsOpen || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const pans: Record<string, [number, number]> = {
        ArrowLeft: [PAN_STEP, 0],
        ArrowRight: [-PAN_STEP, 0],
        ArrowUp: [0, PAN_STEP],
        ArrowDown: [0, -PAN_STEP],
      };
      const pan = pans[e.key];
      if (pan) {
        e.preventDefault();
        mapActions.panBy(pan[0], pan[1]);
      } else if (e.key === '+' || e.key === '=') {
        mapActions.zoomIn();
      } else if (e.key === '-') {
        mapActions.zoomOut();
      } else if (e.key === 'Escape') {
        if (location.pathname.startsWith('/land/')) navigate('/');
        else mapActions.clearSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [location.pathname, navigate]);

  // Wheel zoom around the pointer (non-passive, so the page itself never scrolls).
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctrl = controller.current;
      if (!ctrl) return;
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      ctrl.zoomBy(factor, performance.now(), { anchor: [e.clientX - rect.left, e.clientY - rect.top] });
      draw(ctrl.frameAt(performance.now()), performance.now());
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [draw]);

  // Drag to pan; a click without movement opens a continent or country.
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      if (!d.moved) (e.currentTarget as Element).setPointerCapture(e.pointerId);
      d.moved = true;
      d.x = e.clientX;
      d.y = e.clientY;
      controller.current?.panBy(dx, dy);
      if (controller.current) draw(controller.current.frameAt(performance.now()), performance.now());
      hideTooltip();
      return;
    }
    showTooltip(e);
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const id = (e.target as Element).closest('[data-id]')?.getAttribute('data-id');
    if (id) openCountry(id);
  };

  const showTooltip = (e: PointerEvent) => {
    const tip = tooltip.current;
    if (!tip || !container.current) return;
    const id = (e.target as Element).closest('[data-id]')?.getAttribute('data-id');
    const country = id ? atlasCountry(id) : undefined;
    if (!country) return hideTooltip();
    const rect = container.current.getBoundingClientRect();
    tip.textContent = country.name;
    tip.style.transform = `translate(${e.clientX - rect.left + 14}px, ${e.clientY - rect.top + 16}px)`;
    tip.style.opacity = '1';
  };
  const hideTooltip = () => {
    if (tooltip.current) tooltip.current.style.opacity = '0';
  };

  return (
    <div ref={container} className={styles.map} data-selected={selected ?? undefined}>
      <svg
        ref={mapSvg}
        className={styles.svg}
        width={size.width}
        height={size.height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={hideTooltip}
        role="img"
        aria-label="Weltkarte"
      >
        <g ref={cameraGroup}>
          <path className={styles.sphere} d={SPHERE_PATH} />
          <path className={styles.graticule} d={GRATICULE_PATH} />
          {BY_CONTINENT.map((group) => (
            <ContinentGroup
              key={group.id}
              id={group.id}
              countries={group.countries}
              state={selected === null ? 'all' : selected === group.id ? 'current' : 'dimmed'}
              visited={visited}
              focused={focused}
            />
          ))}
        </g>
      </svg>
      <svg className={styles.flight} width={size.width} height={size.height} aria-hidden="true">
        <mask id="roam-trail-reveal" maskUnits="userSpaceOnUse">
          <path ref={trailMask} className={styles.trailMask} pathLength={1} stroke="white" />
        </mask>
        <path ref={trail} className={styles.trail} mask="url(#roam-trail-reveal)" />
        <g ref={plane} className={styles.plane}>
          <path d={PLANE_PATH} />
        </g>
      </svg>
      <CloudLayer ref={clouds} />
      <div ref={tooltip} className={styles.tooltip} aria-hidden="true" />
    </div>
  );
}

interface ContinentGroupProps {
  id: ContinentId;
  countries: AtlasCountry[];
  state: 'all' | 'current' | 'dimmed';
  visited: Set<string>;
  focused: string | null;
}

const ContinentGroup = memo(function ContinentGroup({ id, countries, state, visited, focused }: ContinentGroupProps) {
  return (
    <g className={cx(styles.continent, state === 'current' && styles.current, state === 'dimmed' && styles.dimmed)} data-continent={id}>
      {countries.map((c) => (
        <path
          key={c.id}
          data-id={c.id}
          d={c.d}
          className={cx(styles.country, visited.has(c.id) && styles.visited, focused === c.id && styles.focused)}
        />
      ))}
      {countries
        .filter((c) => c.tiny)
        .map((c) => (
          <circle
            key={`${c.id}-dot`}
            data-id={c.id}
            cx={c.label[0]}
            cy={c.label[1]}
            r={3.2}
            className={cx(styles.dot, visited.has(c.id) && styles.visited, focused === c.id && styles.focused)}
          />
        ))}
    </g>
  );
});
