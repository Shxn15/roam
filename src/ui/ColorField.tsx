import { useEffect, useId, useState } from 'react';
import { isHexColor, normalizeHex } from '../theme/color';
import { cx } from './cx';
import styles from './ColorField.module.css';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange(hex: string): void;
  suggestions?: readonly string[];
}

/** Swatch with the system color picker, a hex input and a few suggested colors. */
export function ColorField({ label, value, onChange, suggestions = [] }: ColorFieldProps) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const commit = (raw: string) => {
    const candidate = raw.startsWith('#') ? raw : `#${raw}`;
    if (isHexColor(candidate)) onChange(normalizeHex(candidate));
    else setText(value);
  };

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <label htmlFor={`${id}-hex`} className={styles.label}>
          {label}
        </label>
        <div className={styles.inputs}>
          <span className={styles.swatch} style={{ background: value }}>
            <input
              type="color"
              aria-label={`${label} wählen`}
              value={value.toLowerCase()}
              onChange={(e) => onChange(normalizeHex(e.target.value))}
            />
          </span>
          <input
            id={`${id}-hex`}
            className={styles.hex}
            value={text}
            spellCheck={false}
            maxLength={7}
            onChange={(e) => {
              setText(e.target.value);
              if (/^#?[0-9a-f]{6}$/i.test(e.target.value)) commit(e.target.value);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className={styles.suggestions} role="group" aria-label={`Vorschläge für ${label}`}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              title={s}
              aria-label={s}
              className={cx(styles.suggestion, s.toUpperCase() === value.toUpperCase() && styles.current)}
              style={{ background: s }}
              onClick={() => onChange(normalizeHex(s))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
