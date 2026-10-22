import { TriangleAlert, X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  CATEGORY_LABELS,
  TIME_BLOCK_CATEGORIES,
  blocksOverlap,
  formatTimeSpan,
  validateTimeBlock,
  type TimeBlock,
  type TimeBlockDraft,
  type TimeBlockErrors,
  type TimeBlockInput,
} from '../../domain/dayPlan';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { TextArea, TextField } from '../../ui/TextField';
import { CATEGORY_ICONS } from './categories';
import { listTitles } from './format';
import styles from './TimeBlockForm.module.css';

interface TimeBlockFormProps {
  initial: TimeBlockDraft;
  /** The other blocks of the day, for the live overlap hint. */
  others: TimeBlock[];
  submitLabel: string;
  onSubmit(input: TimeBlockInput): Promise<void>;
  onCancel(): void;
}

const CATEGORY_OPTIONS = TIME_BLOCK_CATEGORIES.map((value) => {
  const Icon = CATEGORY_ICONS[value];
  return { value, label: CATEGORY_LABELS[value], icon: <Icon size={14} aria-hidden /> };
});

/** Creates or edits a time block. Moving a block works through its time (drag comes later). */
export function TimeBlockForm({ initial, others, submitLabel, onSubmit, onCancel }: TimeBlockFormProps) {
  const [draft, setDraft] = useState<TimeBlockDraft>(initial);
  const [errors, setErrors] = useState<TimeBlockErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof TimeBlockDraft>(key: K, value: TimeBlockDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Overlaps while typing: a hint, never a reason not to save.
  const clashes = useMemo(() => {
    const checked = validateTimeBlock({ ...draft, title: draft.title || '–' });
    return checked.ok ? others.filter((o) => blocksOverlap(o, checked.value)) : [];
  }, [draft, others]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = validateTimeBlock(draft);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(checked.value);
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault(); // cancel here; the map would leave the country page
      onCancel();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} onKeyDown={onKeyDown} noValidate aria-label={submitLabel}>
      <div className={styles.times}>
        <TextField
          label="Beginn"
          type="time"
          step={300}
          required
          value={draft.startTime}
          error={errors.startTime}
          onChange={(e) => set('startTime', e.target.value)}
        />
        <div className={styles.end}>
          <TextField
            label="Ende"
            type="time"
            step={300}
            value={draft.endTime ?? ''}
            error={errors.endTime}
            hint={draft.endTime ? undefined : 'Optional, z. B. für einen Check-in'}
            onChange={(e) => set('endTime', e.target.value || null)}
          />
          {draft.endTime && (
            <button type="button" className={styles.clearEnd} onClick={() => set('endTime', null)} aria-label="Ende entfernen" title="Ende entfernen">
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.category}>
          <span className={styles.label}>Kategorie</span>
          <Segmented label="Kategorie" options={CATEGORY_OPTIONS} value={draft.category} onChange={(v) => set('category', v)} />
        </div>
      </div>
      <TextField label="Titel" value={draft.title} maxLength={120} error={errors.title} autoFocus onChange={(e) => set('title', e.target.value)} />
      <TextField
        label="Ort"
        value={draft.location}
        maxLength={120}
        placeholder="Freitext, z. B. Arashiyama, Kyoto"
        error={errors.location}
        onChange={(e) => set('location', e.target.value)}
      />
      <TextArea label="Notiz" value={draft.note} maxLength={2000} rows={2} error={errors.note} onChange={(e) => set('note', e.target.value)} />
      {clashes.length > 0 && (
        <p className={styles.clash} role="status">
          <TriangleAlert size={14} aria-hidden />
          Überschneidet sich mit {listTitles(clashes.map((c) => c.title))} ({clashes.map(formatTimeSpan).join(', ')}). Speichern geht trotzdem.
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
