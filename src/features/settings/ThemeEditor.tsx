import { ChevronDown, RotateCcw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { resetBase } from '../../theme/custom';
import { sameColors } from '../../theme/editing';
import { isPresetId } from '../../theme/presets';
import { COLOR_SUGGESTIONS } from '../../theme/suggestions';
import { activeTheme, effectiveTheme, isDirty, useThemeStore } from '../../theme/themeStore';
import { COLOR_ROLE_LABELS, type ColorRole } from '../../theme/types';
import { Button } from '../../ui/Button';
import { ColorField } from '../../ui/ColorField';
import { TextField } from '../../ui/TextField';
import { notify, reportError } from '../../ui/toast';
import styles from './ThemeEditor.module.css';

const MAIN_ROLES: ColorRole[] = ['accent', 'background', 'button', 'buttonText'];
const MORE_ROLES: ColorRole[] = ['surface', 'text', 'border'];

export function ThemeEditor() {
  const theme = useThemeStore(effectiveTheme);
  const active = useThemeStore(activeTheme);
  const dirty = useThemeStore(isDirty);
  const editColor = useThemeStore((s) => s.editColor);
  const resetToPreset = useThemeStore((s) => s.resetToPreset);
  const discardDraft = useThemeStore((s) => s.discardDraft);
  const saveDraftAsNew = useThemeStore((s) => s.saveDraftAsNew);
  const saveDraftInPlace = useThemeStore((s) => s.saveDraftInPlace);
  const [showMore, setShowMore] = useState(false);
  const [name, setName] = useState('');

  const preset = isPresetId(active.id);
  const base = resetBase(theme);
  const atBase = sameColors(theme, base);

  const saveAsNew = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void saveDraftAsNew(name)
      .then((saved) => {
        setName('');
        notify(`„${saved.name}“ gespeichert`);
      })
      .catch(reportError('Theme konnte nicht gespeichert werden'));
  };

  const field = (role: ColorRole) => (
    <ColorField
      key={role}
      label={COLOR_ROLE_LABELS[role]}
      value={theme.colors[role]}
      suggestions={COLOR_SUGGESTIONS[role]}
      onChange={(hex) => editColor(role, hex)}
    />
  );

  return (
    <div className={styles.editor}>
      <div className={styles.head}>
        <h4>Farben anpassen</h4>
        <p>
          {preset
            ? `Du bearbeitest „${active.name}“. Presets bleiben unverändert – speichere deine Variante als eigenes Theme.`
            : `Eigenes Theme „${active.name}“, basiert auf „${base.name}“.`}{' '}
          Jede Änderung siehst du sofort in der ganzen App.
        </p>
      </div>

      <div className={styles.fields}>{MAIN_ROLES.map(field)}</div>

      <button type="button" className={styles.more} aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
        <ChevronDown size={16} className={showMore ? styles.open : undefined} aria-hidden />
        Weitere Farbrollen: Oberfläche, Text, Rahmen
      </button>
      {showMore && <div className={styles.fields}>{MORE_ROLES.map(field)}</div>}

      <div className={styles.actions}>
        <div className={styles.row}>
          <Button variant="secondary" size="sm" icon={<RotateCcw size={15} />} disabled={atBase} onClick={resetToPreset}>
            Zurücksetzen
          </Button>
          {dirty && (
            <Button variant="ghost" size="sm" onClick={discardDraft}>
              Änderungen verwerfen
            </Button>
          )}
          {dirty && <span className={styles.badge}>Ungespeichert</span>}
          {!preset && dirty && (
            <Button
              variant="primary"
              size="sm"
              className={styles.push}
              onClick={() =>
                void saveDraftInPlace()
                  .then(() => notify(`„${active.name}“ gespeichert`))
                  .catch(reportError('Theme konnte nicht gespeichert werden'))
              }
            >
              Änderungen speichern
            </Button>
          )}
        </div>
        <form className={styles.saveAs} onSubmit={saveAsNew}>
          <TextField
            label="Name für ein eigenes Theme"
            hideLabel
            placeholder="Name, z. B. Herbstabend"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant={preset && dirty ? 'primary' : 'secondary'} disabled={!name.trim()}>
            Als eigenes Theme speichern
          </Button>
        </form>
      </div>
    </div>
  );
}
