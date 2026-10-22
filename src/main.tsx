import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/fredoka';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { systemPrefersReducedMotion } from './motion/systemMotion';
import { applyTheme, readCachedTheme } from './theme/applyTheme';
import { defaultTheme } from './theme/presets';

// Paint in the last used theme right away; the database confirms it a moment later.
applyTheme(readCachedTheme() ?? defaultTheme(), systemPrefersReducedMotion() ? 'reduced' : 'full');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
