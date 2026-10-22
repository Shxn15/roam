import { countryTheme } from '../../theme/countryTheme';
import { PATTERNS } from '../../theme/patterns';
import styles from './CountryPattern.module.css';

/**
 * The country's pattern behind the header, at 3–6 % opacity (a token per appearance). Lines
 * take the country accent, the "ground" shapes the header color, so overlapping motifs (the
 * waves of Seigaiha) cover each other. Countries without a theme of their own show nothing.
 */
export function CountryPattern({ countryId }: { countryId: string }) {
  const theme = countryTheme(countryId);
  if (!theme) return null;
  const tile = PATTERNS[theme.pattern];
  const id = `roam-pattern-${countryId}`;
  return (
    <svg className={styles.pattern} aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id={id}
          width={tile.width}
          height={tile.height}
          patternUnits="userSpaceOnUse"
          dangerouslySetInnerHTML={{ __html: tile.markup }}
        />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
