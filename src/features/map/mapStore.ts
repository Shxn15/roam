import { create } from 'zustand';
import { atlasCountry } from '../../geo/atlas';
import type { ContinentId } from '../../geo/continents';
import type { Insets } from './camera';
import type { MapController } from './controller';
import { FOLLOW } from './follow';

/**
 * State the panels need. It changes only at the start of a move (selection) and when the
 * camera has arrived (reveal), never during the animation. The map itself does not render
 * from this store: it applies selection, focus and detail level directly to its DOM.
 */
interface MapState {
  /** Chosen continent; set as soon as its transition starts. */
  selected: ContinentId | null;
  /** The continent whose countries may be shown (the camera has arrived). */
  revealed: ContinentId | null;
  /** Country framed on the country page. */
  focusedCountry: string | null;
  /** Destination of the country flight in progress; the home panels step aside meanwhile. */
  flyingTo: string | null;
}

export const useMapStore = create<MapState>(() => ({ selected: null, revealed: null, focusedCountry: null, flyingTo: null }));

let controller: MapController | null = null;
let wake: () => void = () => undefined;
let focusInsets: Insets | undefined;
let pendingFlight: { id: string; resolve(arrived: boolean): void } | null = null;
let focusBeforeFlight: string | null = null;
let skippedAt = -Infinity;

/** Called by the map once it knows its size. Returns a detach function. */
export function attachMap(c: MapController, requestFrame: () => void): () => void {
  controller = c;
  wake = requestFrame;
  const { focusedCountry } = useMapStore.getState();
  if (focusedCountry) focus(focusedCountry);
  return () => {
    controller = null;
    wake = () => undefined;
  };
}

function focus(id: string) {
  const country = atlasCountry(id);
  if (country && controller) controller.focusBox(country.box, focusInsets, performance.now());
}

const run = (action: (c: MapController, now: number) => void) => {
  if (!controller) return;
  action(controller, performance.now());
  wake();
};

function settleFlight(id: string, arrived: boolean) {
  if (!pendingFlight || pendingFlight.id !== id) return;
  const { resolve } = pendingFlight;
  pendingFlight = null;
  useMapStore.setState(arrived ? { flyingTo: null } : { flyingTo: null, focusedCountry: focusBeforeFlight });
  resolve(arrived);
}

/** The map controller reports landings and cancelled flights here. */
export const flightEvents = {
  onArrive: (id: string) => settleFlight(id, true),
  onFlightCancel: (id: string) => settleFlight(id, false),
};

/** Milliseconds since a flight was last skipped by a click (to swallow that click's follow-ups). */
export const msSinceSkip = () => performance.now() - skippedAt;

export const mapActions = {
  selectContinent: (id: ContinentId) => run((c, now) => c.select(id, now)),
  clearSelection: () => run((c, now) => c.clear(now)),
  zoomIn: () => run((c, now) => c.zoomBy(1.6, now, { tau: FOLLOW.stepTau })),
  zoomOut: () => run((c, now) => c.zoomBy(1 / 1.6, now, { tau: FOLLOW.stepTau })),
  panBy: (dx: number, dy: number) => run((c, now) => c.panBy(dx, dy, now)),
  focusCountry(id: string, insets?: Insets) {
    focusInsets = insets;
    useMapStore.setState({ focusedCountry: id });
    run(() => focus(id));
  },
  releaseCountry() {
    useMapStore.setState({ focusedCountry: null });
    run((c, now) => c.releaseFocus(now));
  },
  /**
   * Flies to a country: plane, clouds, zoom, ring. Resolves `true` when it lands (or is skipped
   * to its end) and `false` when another move replaces it first.
   */
  flyToCountry(id: string, insets?: Insets): Promise<boolean> {
    const country = atlasCountry(id);
    if (!country || !controller) return Promise.resolve(true); // nothing to animate: open the page at once
    return new Promise((resolve) => {
      if (!pendingFlight) focusBeforeFlight = useMapStore.getState().focusedCountry;
      focusInsets = insets;
      // The controller cancels a flight still under way (and settles it) before this one starts.
      run((c, now) => c.flyToCountry({ id, box: country.box, at: country.label }, insets, now));
      pendingFlight = { id, resolve };
      useMapStore.setState({ flyingTo: id, focusedCountry: id });
    });
  },
  /** A second click: the flight lands at once. */
  skipFlight() {
    if (!useMapStore.getState().flyingTo) return;
    skippedAt = performance.now();
    run((c) => c.finish());
  },
  /** Escape during a flight: back to the continent (or the world) instead of landing. */
  abortFlight() {
    if (!useMapStore.getState().flyingTo) return;
    run((c, now) => (c.selected ? c.select(c.selected, now) : c.clear(now)));
  },
};
