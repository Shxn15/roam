import { useCallback } from 'react';
import { PRESETS } from '../../theme/presets';
import { isDirty, useThemeStore } from '../../theme/themeStore';
import type { ThemeRecord } from '../../theme/types';
import { notify, reportError } from '../../ui/toast';
import { ThemeCard } from './ThemeCard';
import styles from './ThemeGallery.module.css';

export function ThemeGallery() {
  const custom = useThemeStore((s) => s.custom);
  const activeId = useThemeStore((s) => s.activeId);

  // Stable handlers, so unchanged cards skip re-rendering on a switch.
  const choose = useCallback((id: string) => {
    const state = useThemeStore.getState();
    if (id === state.activeId) return;
    if (isDirty(state)) notify('Ungespeicherte Änderungen wurden verworfen');
    state.select(id);
  }, []);
  const remove = useCallback((theme: ThemeRecord) => {
    void useThemeStore
      .getState()
      .deleteCustom(theme.id)
      .then(() => notify(`„${theme.name}“ gelöscht`))
      .catch(reportError('Theme konnte nicht gelöscht werden'));
  }, []);

  return (
    <div className={styles.gallery}>
      <div className={styles.grid}>
        {PRESETS.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} selected={theme.id === activeId} onSelect={choose} />
        ))}
      </div>
      {custom.length > 0 && (
        <>
          <h5 className={styles.subhead}>Eigene Themes</h5>
          <div className={styles.grid}>
            {custom.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} selected={theme.id === activeId} onSelect={choose} onDelete={remove} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
