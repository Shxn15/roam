// @vitest-environment jsdom
import { Profiler, act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import { setDb } from '../../db/instance';
import { createTestDb } from '../../db/testing';
import { applyTheme } from '../../theme/applyTheme';
import { defaultTheme, findPreset } from '../../theme/presets';
import { startThemeSync, useThemeStore } from '../../theme/themeStore';
import { WorldMap } from './WorldMap';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

function themeVar(name: string): string | undefined {
  const text = document.getElementById('roam-theme')?.textContent ?? '';
  return new RegExp(`${name}:([^;}]+)`).exec(text)?.[1];
}

describe('world map and theme', () => {
  const commits: string[] = [];
  let svg: SVGSVGElement;

  beforeAll(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    setDb(await createTestDb());
    useThemeStore.setState({ activeId: 'standard', draft: null, custom: [], motionPreference: 'full' });
    applyTheme(defaultTheme(), 'full');
    startThemeSync();
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () =>
      createRoot(host).render(
        <MemoryRouter>
          <Profiler id="map" onRender={(_id, phase) => commits.push(phase)}>
            <WorldMap />
          </Profiler>
        </MemoryRouter>,
      ),
    );
    svg = host.querySelector<SVGSVGElement>('svg[aria-label="Weltkarte"]')!;
  });

  it('renders all countries in two detail levels', () => {
    expect(svg.querySelectorAll('path[data-id]').length).toBeGreaterThan(400);
  });

  it('changes only CSS variables on a theme switch; the map component does not re-render', async () => {
    const before = commits.length;
    const dom = svg.outerHTML;
    expect(themeVar('--map-land')).toBe(defaultTheme().map!.land);

    await act(async () => useThemeStore.getState().select('dunkel'));

    expect(themeVar('--map-land')).toBe(findPreset('dunkel')!.map!.land);
    expect(themeVar('--map-ocean')).toBe(findPreset('dunkel')!.map!.ocean);
    expect(commits.length).toBe(before); // no React commit for the map
    expect(svg.outerHTML).toBe(dom); // and not a single change in its DOM
  });

  it('takes every color from CSS variables, none as attributes or inline styles', () => {
    const colored = [...svg.querySelectorAll('*')].filter(
      (el) =>
        ['fill', 'stroke'].some((attr) => el.hasAttribute(attr)) ||
        /(fill|stroke|color|background)\s*:/.test(el.getAttribute('style') ?? ''),
    );
    expect(colored.map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  });
});
