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
import { useOpenCountry } from '../country/useOpenCountry';
import { easeOutCubic, mapToScreen, type Viewport } from './camera';
import { CloudLayer, type CloudLayerHandle } from './CloudLayer';
import { MapController, lodFor } from './controller';
import { FOLLOW } from './follow';
import { attachMap, flightEvents, mapActions, msSinceSkip, useMapStore } from './mapStore';
import { headingAt, pointAt, transformRoute } from './route';
import type { TransitionFrame } from './transition';
import { useElementSize } from './useElementSize';
import styles from './WorldMap.module.css';

const BY_CONTINENT = CONTINENT_IDS.map((id) => ({ id, countries: ATLAS.countries.filter((c) => c.continent === id) }));
const PAN_STEP = 90;
/** Zoom per pixel of wheel delta; pinch gestures arrive as ctrl+wheel with small deltas. */
const WHEEL_ZOOM = 0.0015;
const PINCH_ZOOM = 0.01;

function routeSvgPath(r: { from: readonly number[]; control: readonly number[]; to: readonly number[] }): string {
  const f = (n: number | undefined) => (n ?? 0).toFixed(1);
  return `M${f(r.from[0])} ${f(r.from[1])}Q${f(r.control[0])} ${f(r.control[1])} ${f(r.to[0])} ${f(r.to[1])}`;
}

/**
 * The full-screen world map. Layers: the map (one transform on one group), the flight route
 * with the plane, the clouds, and a name tooltip.
 *
 * React renders the map only when the data changes (visited countries). Everything that moves
 * or changes during an animation is applied directly to the DOM from one requestAnimationFrame
 * loop: the camera transform, the emphasized continent, the focused country and the detail
 * level. Colors come only from CSS custom properties, so a theme switch never re-renders it.
 */
export function WorldMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapSvg = useRef<SVGSVGElement>(null);
  const cameraGroup = useRef<SVGGElement>(null);
  const dots = useRef<SVGGElement>(null);
  const focusStyle = useRef<HTMLStyleElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const trailMask = useRef<SVGPathElement>(null);
  const plane = useRef<SVGGElement>(null);
  const pop = useRef<SVGGElement>(null);
  const popRing = useRef<SVGCircleElement>(null);
  const popGlow = useRef<SVGCircleElement>(null);
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
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const countries = useTravelStore((s) => s.countries);
  const visited = useMemo(() => new Set(countries.filter((c) => c.visited).map((c) => c.id)), [countries]);

  const draw = useCallback((frame: TransitionFrame, now: number) => {
    const ctrl = controller.current;
    const g = cameraGroup.current;
    if (!ctrl || !g || !container.current) return;
    const { x, y, k } = frame.camera;
    g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})`);
    // Only the few microstate dots need the zoom (to keep a constant size on screen).
    dots.current?.style.setProperty('--k', k.toFixed(5));
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
      plane.current.setAttribute(
        'transform',
        `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${(heading + 90).toFixed(1)}) scale(1.3) translate(-12 -12)`,
      );
      plane.current.style.opacity = frame.planeOpacity.toFixed(3);
    } else {
      if (trail.current) trail.current.style.opacity = '0';
      if (plane.current) plane.current.style.opacity = '0';
    }

    // After landing in a country: a ring pops up in the country's accent and fades out.
    const tr = ctrl.transition;
    if (pop.current && popRing.current && popGlow.current) {
      if (frame.pop !== null && tr?.popAt) {
        const [px, py] = mapToScreen(frame.camera, tr.popAt);
        const grow = easeOutCubic(frame.pop);
        const fade = 1 - frame.pop;
        if (pop.current.dataset.countryTheme !== tr.arrival) pop.current.dataset.countryTheme = tr.arrival ?? '';
        pop.current.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
        popRing.current.setAttribute('r', (8 + 40 * grow).toFixed(2));
        popRing.current.style.strokeWidth = (0.8 + 3.2 * fade).toFixed(2);
        popRing.current.style.opacity = (fade ** 1.3).toFixed(3);
        popGlow.current.setAttribute('r', (5 + 20 * grow).toFixed(2));
        popGlow.current.style.opacity = (0.4 * fade * fade).toFixed(3);
        pop.current.style.opacity = '1';
      } else {
        pop.current.style.opacity = '0';
      }
    }
  }, []);

  /** The one animation loop: runs while the controller has something to move. */
  const requestFrame = useCallback(() => {
    if (frameRequest.current) return;
    const step = (now: number) => {
      frameRequest.current = 0;
      const ctrl = controller.current;
      if (!ctrl) return;
      draw(ctrl.tick(now), now);
      if (ctrl.animating) frameRequest.current = requestAnimationFrame(step);
    };
    frameRequest.current = requestAnimationFrame(step);
  }, [draw]);

  const applyLod = useCallback((k: number) => {
    if (mapSvg.current) mapSvg.current.dataset.lod = lodFor(k);
  }, []);

  // Create the controller once the size is known; keep it in sync with resizes.
  useLayoutEffect(() => {
    if (!size.width || !size.height) return;
    const viewport: Viewport = { width: size.width, height: size.height, insets: HOME_MAP_INSETS };
    if (!controller.current) {
      controller.current = new MapController(viewport, () => motionRef.current, {
        onSelect: (continent) => useMapStore.setState({ selected: continent }),
        onReveal: (continent) => useMapStore.setState({ revealed: continent }),
        onMapSelection: (continent) => {
          const svg = mapSvg.current;
          if (!svg) return;
          if (continent) svg.dataset.selected = continent;
          else delete svg.dataset.selected;
        },
        onRest: (camera) => applyLod(camera.k),
        onArrive: flightEvents.onArrive,
        onFlightCancel: flightEvents.onFlightCancel,
      });
    } else {
      controller.current.setViewport(viewport);
    }
    const now = performance.now();
    draw(controller.current.frameAt(now), now);
    if (!controller.current.animating) applyLod(controller.current.camera.k);
    requestFrame();
  }, [size.width, size.height, draw, requestFrame, applyLod]);

  useEffect(() => {
    if (!controller.current) return;
    return attachMap(controller.current, requestFrame);
  }, [requestFrame, size.width > 0]);

  useEffect(() => () => cancelAnimationFrame(frameRequest.current), []);

  // The focused country (country page) is highlighted by one CSS rule, not by re-rendering.
  useEffect(() => {
    const show = (id: string | null) => {
      if (!focusStyle.current) return;
      const safe = id && /^[A-Z0-9]{3}$/.test(id) ? id : null;
      focusStyle.current.textContent = safe
        ? `[data-roam-map] [data-id="${safe}"] { fill: var(--map-focus); stroke: var(--accent); }`
        : '';
    };
    show(useMapStore.getState().focusedCountry);
    return useMapStore.subscribe((s, prev) => {
      if (s.focusedCountry !== prev.focusedCountry) show(s.focusedCountry);
    });
  }, []);

  const openCountryPage = useOpenCountry();
  const openCountry = useCallback(
    (id: string) => {
      const country = atlasCountry(id);
      if (!country) return;
      const onCountryPage = pathRef.current.startsWith('/land/');
      if (!onCountryPage && useMapStore.getState().selected !== country.continent) {
        mapActions.selectContinent(country.continent);
      } else if (!pathRef.current.startsWith(`/land/${id}`)) {
        openCountryPage(id);
      }
    },
    [openCountryPage],
  );

  // A second click anywhere during a country flight lands at once. Clicks on elements that
  // open a country decide for themselves (they land on the country they name); the click
  // that skipped is swallowed, so it cannot hit the country page appearing under it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const flying = useMapStore.getState().flyingTo !== null;
      if (!flying && msSinceSkip() > 400) return;
      if (flying && e.target instanceof Element && e.target.closest('[data-opens-country]')) return;
      e.preventDefault();
      e.stopPropagation();
      if (flying) mapActions.skipFlight();
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, []);

  // Keyboard: arrows pan, +/- zoom, Escape leaves the country page or the continent.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useUi.getState().settingsOpen || e.defaultPrevented) return;
      if (e.key === 'Escape' && useMapStore.getState().flyingTo) {
        mapActions.abortFlight();
        return;
      }
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Inside the country page, arrows and +/- belong to the page (lists, tabs, scrolling).
      const inPage = e.target instanceof Element && e.target.closest('[data-keeps-keys]') !== null;
      if (inPage && e.key !== 'Escape') return;
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
        if (pathRef.current.startsWith('/land/')) navigate('/');
        else mapActions.clearSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Wheel and trackpad only move the zoom target; the loop glides there.
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctrl = controller.current;
      if (!ctrl) return;
      const rect = el.getBoundingClientRect();
      const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
      const factor = Math.exp(-pixels * (e.ctrlKey ? PINCH_ZOOM : WHEEL_ZOOM));
      ctrl.zoomBy(factor, performance.now(), { anchor: [e.clientX - rect.left, e.clientY - rect.top] });
      requestFrame();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [requestFrame]);

  // Drag moves the pan target; releasing lets the map glide out. A click opens a continent or country.
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; samples: { t: number; x: number; y: number }[] } | null>(
    null,
  );
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      if (!d.moved) {
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          // Synthetic or already released pointers cannot be captured; dragging still works.
        }
      }
      d.moved = true;
      d.x = e.clientX;
      d.y = e.clientY;
      d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      while (d.samples.length > 2 && e.timeStamp - d.samples[0]!.t > 100) d.samples.shift();
      const rect = container.current!.getBoundingClientRect();
      controller.current?.panBy(dx, dy, performance.now(), {
        anchor: [e.clientX - rect.left, e.clientY - rect.top],
        tau: FOLLOW.dragTau,
      });
      requestFrame();
      hideTooltip();
      return;
    }
    showTooltip(e);
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      const first = d.samples[0]!;
      const span = e.timeStamp - first.t;
      if (span > 0 && span < 160) {
        controller.current?.fling((e.clientX - first.x) / span, (e.clientY - first.y) / span, performance.now());
        requestFrame();
      }
      return;
    }
    if (useMapStore.getState().flyingTo) {
      mapActions.skipFlight();
      return;
    }
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
    <div ref={container} className={styles.map} data-theme-fade="">
      <style ref={focusStyle} />
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
        data-roam-map=""
      >
        <g ref={cameraGroup}>
          <path className={styles.sphere} d={SPHERE_PATH} />
          <path className={styles.graticule} d={GRATICULE_PATH} />
          {BY_CONTINENT.map((group) => (
            <ContinentGroup key={group.id} id={group.id} countries={group.countries} visited={visited} />
          ))}
          <g ref={dots} className={styles.dots}>
            {BY_CONTINENT.map((group) => (
              <MicrostateDots key={group.id} id={group.id} countries={group.countries} visited={visited} />
            ))}
          </g>
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
        <g ref={pop} className={styles.pop} data-country-theme="">
          <circle ref={popGlow} className={styles.popGlow} r={0} />
          <circle ref={popRing} className={styles.popRing} r={0} />
        </g>
      </svg>
      <CloudLayer ref={clouds} />
      <div ref={tooltip} className={styles.tooltip} aria-hidden="true" />
    </div>
  );
}

interface GroupProps {
  id: ContinentId;
  countries: AtlasCountry[];
  visited: Set<string>;
}

/** Each country twice: coarse outlines for wide views, detailed ones when zoomed in (data-lod). */
const ContinentGroup = memo(function ContinentGroup({ id, countries, visited }: GroupProps) {
  return (
    <g className={styles.continent} data-continent={id}>
      {countries.map((c) => (
        <path key={`${c.id}-c`} data-id={c.id} d={c.dc} className={cx(styles.country, styles.coarse, visited.has(c.id) && styles.visited)} />
      ))}
      {countries.map((c) => (
        <path key={`${c.id}-f`} data-id={c.id} d={c.d} className={cx(styles.country, styles.fine, visited.has(c.id) && styles.visited)} />
      ))}
    </g>
  );
});

/** Small states are dots that keep their size on screen whatever the zoom. */
const MicrostateDots = memo(function MicrostateDots({ id, countries, visited }: GroupProps) {
  return (
    <g data-continent={id}>
      {countries
        .filter((c) => c.tiny)
        .map((c) => (
          <circle
            key={c.id}
            data-id={c.id}
            cx={c.label[0]}
            cy={c.label[1]}
            r={3.2}
            className={cx(styles.dot, visited.has(c.id) && styles.visited)}
          />
        ))}
    </g>
  );
});
