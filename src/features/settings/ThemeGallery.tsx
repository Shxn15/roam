import { PRESETS } from '../../theme/presets';
import { isDirty, useThemeStore } from '../../theme/themeStore';
import { notify, reportError } from '../../ui/toast';
import { ThemeCard } from './ThemeCard';
import styles from './ThemeGallery.module.css';

export function ThemeGallery() {
  const custom = useThemeStore((s) => s.custom);
  const activeId = useThemeStore((s) => s.activeId);
  const select = useThemeStore((s) => s.select);
  const deleteCustom = useThemeStore((s) => s.deleteCustom);

  const choose = (id: string) => {
    if (id === activeId) return;
    if (isDirty(useThemeStore.getState())) notify('Ungespeicherte Änderungen wurden verworfen');
    select(id);
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.grid}>
        {PRESETS.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} selected={theme.id === activeId} onSelect={() => choose(theme.id)} />
        ))}
      </div>
      {custom.length > 0 && (
        <>
          <h5 className={styles.subhead}>Eigene Themes</h5>
          <div className={styles.grid}>
            {custom.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={theme.id === activeId}
                onSelect={() => choose(theme.id)}
                onDelete={() =>
                  void deleteCustom(theme.id)
                    .then(() => notify(`„${theme.name}“ gelöscht`))
                    .catch(reportError('Theme konnte nicht gelöscht werden'))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
