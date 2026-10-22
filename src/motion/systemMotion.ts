const QUERY = '(prefers-reduced-motion: reduce)';

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

/** Calls `onChange` whenever the OS setting "Bewegung reduzieren" changes. */
export function watchSystemReducedMotion(onChange: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia(QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}
