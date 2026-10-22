import { create } from 'zustand';
import { atlasCountry } from '../../geo/atlas';
import type { ContinentId } from '../../geo/continents';
import type { Insets } from './camera';
import type { MapController } from './controller';

interface MapState {
  /** Chosen continent; set as soon as its transition starts. */
  selected: ContinentId | null;
  /** The continent whose countries may be shown (phase 3 of the transition reached). */
  revealed: ContinentId | null;
  /** Country framed on the country page. */
  focusedCountry: string | null;
}

export const useMapStore = create<MapState>(() => ({ selected: null, revealed: null, focusedCountry: null }));

let controller: MapController | null = null;
let wake: () => void = () => undefined;
let focusInsets: Insets | undefined;

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

export const mapActions = {
  selectContinent: (id: ContinentId) => run((c, now) => c.select(id, now)),
  clearSelection: () => run((c, now) => c.clear(now)),
  zoomIn: () => run((c, now) => c.zoomBy(1.6, now, { animate: true })),
  zoomOut: () => run((c, now) => c.zoomBy(1 / 1.6, now, { animate: true })),
  panBy: (dx: number, dy: number) => run((c) => c.panBy(dx, dy)),
  focusCountry(id: string, insets?: Insets) {
    focusInsets = insets;
    useMapStore.setState({ focusedCountry: id });
    run(() => focus(id));
  },
  releaseCountry() {
    useMapStore.setState({ focusedCountry: null });
    run((c, now) => c.releaseFocus(now));
  },
};
