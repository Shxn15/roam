import { Database, Palette, Wind, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useUi, type SettingsSection } from '../../app/uiStore';
import { Logo } from '../../brand/Logo';
import { isDirty, useThemeStore } from '../../theme/themeStore';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Sheet } from '../../ui/Sheet';
import { cx } from '../../ui/cx';
import { AppearanceSettings } from './AppearanceSettings';
import { DataSettings } from './DataSettings';
import { MotionSettings } from './MotionSettings';
import styles from './SettingsSheet.module.css';

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Erscheinungsbild', icon: Palette },
  { id: 'motion', label: 'Bewegung', icon: Wind },
  { id: 'data', label: 'Daten', icon: Database },
];

export function SettingsSheet() {
  const open = useUi((s) => s.settingsOpen);
  const section = useUi((s) => s.settingsSection);
  const setSection = useUi((s) => s.setSettingsSection);
  const close = useUi((s) => s.closeSettings);
  const discardDraft = useThemeStore((s) => s.discardDraft);
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty(useThemeStore.getState())) setConfirming(true);
    else close();
  }, [close]);

  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <Sheet open={open} label="Einstellungen" onRequestClose={requestClose}>
      <nav className={styles.nav} aria-label="Einstellungen">
        <h2 className={styles.navTitle}>Einstellungen</h2>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={cx(styles.navItem, id === section && styles.navActive)}
            aria-current={id === section ? 'page' : undefined}
            onClick={() => setSection(id)}
          >
            <Icon size={17} aria-hidden />
            {label}
          </button>
        ))}
        <div className={styles.navFooter}>
          <Logo size={18} />
          <span>Version 0.1</span>
        </div>
      </nav>
      <div className={styles.main}>
        <header className={styles.header}>
          <h3 className={styles.title}>{current.label}</h3>
          <IconButton label="Schließen" icon={<X size={18} />} onClick={requestClose} />
        </header>
        {confirming && (
          <div className={styles.confirm} role="alert">
            <span>Du hast ungespeicherte Theme-Änderungen.</span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                discardDraft();
                setConfirming(false);
                close();
              }}
            >
              Verwerfen und schließen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Weiter bearbeiten
            </Button>
          </div>
        )}
        <div className={styles.scroll}>
          {section === 'appearance' && <AppearanceSettings />}
          {section === 'motion' && <MotionSettings />}
          {section === 'data' && <DataSettings />}
        </div>
      </div>
    </Sheet>
  );
}
