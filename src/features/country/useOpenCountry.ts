import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { countryMapInsets } from '../../app/layout';
import { useUi } from '../../app/uiStore';
import { mapActions, useMapStore } from '../map/mapStore';

/**
 * Opens a country page the way the chips do: the plane flies there first and the page opens
 * when it lands. A click on a country while a flight is under way lands at once – on the
 * country clicked. Elements that open countries carry `data-opens-country`, so the map's
 * "second click skips the flight" listener leaves their clicks alone.
 */
export function useOpenCountry() {
  const navigate = useNavigate();
  return useCallback(
    (id: string, params: Record<string, string> = {}) => {
      const query = new URLSearchParams(params);
      const ui = useUi.getState();
      if (ui.newTripIntent) {
        query.set('neu', '1');
        ui.setNewTripIntent(false);
      }
      const search = query.toString();
      const target = `/land/${id}${search ? `?${search}` : ''}`;
      const flying = useMapStore.getState().flyingTo;
      if (flying === id) {
        mapActions.skipFlight();
        return;
      }
      const landing = mapActions.flyToCountry(id, countryMapInsets(window.innerWidth));
      if (flying) mapActions.skipFlight();
      void landing.then((arrived) => {
        if (arrived) navigate(target);
      });
    },
    [navigate],
  );
}
