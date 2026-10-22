import { Search } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '../../brand/Logo';
import { Panel } from '../../ui/Panel';
import styles from './SearchPanel.module.css';

export function SearchPanel() {
  const [focused, setFocused] = useState(false);
  return (
    <Panel padded={false} className={styles.panel}>
      <div className={styles.brand}>
        <Logo size={26} />
      </div>
      <label className={styles.field}>
        <Search size={16} aria-hidden className={styles.icon} />
        <input
          type="search"
          placeholder="Länder, Städte, Reisen"
          aria-label="Suche nach Ländern, Städten und Reisen"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </label>
      {focused && <p className={styles.hint}>Die Suche kommt zusammen mit der Weltkarte in Meilenstein 2.</p>}
    </Panel>
  );
}
