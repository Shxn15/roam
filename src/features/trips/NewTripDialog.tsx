import { useEffect, useState, type FormEvent } from 'react';
import { useTravelStore } from '../../data/travelStore';
import type { Country } from '../../domain/countries';
import { defaultTripTitle, todayIso, validateTrip, type TripErrors } from '../../domain/trips';
import { TRIP_STATUSES, TRIP_STATUS_LABELS, type TripStatus } from '../../domain/tripStatus';
import { continentName } from '../../geo/continents';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Segmented } from '../../ui/Segmented';
import { TextField } from '../../ui/TextField';
import { notify, reportError } from '../../ui/toast';
import styles from './NewTripDialog.module.css';

interface NewTripDialogProps {
  open: boolean;
  country: Country;
  onClose(): void;
  onCreated(tripId: string): void;
}

const STATUS_OPTIONS = TRIP_STATUSES.map((value) => ({ value, label: TRIP_STATUS_LABELS[value] }));

/** A trip is a project: country (already chosen), title, number of days, status, maybe a start. */
export function NewTripDialog({ open, country, onClose, onCreated }: NewTripDialogProps) {
  const today = todayIso();
  const createTrip = useTravelStore((s) => s.createTrip);
  const [status, setStatus] = useState<TripStatus>('planned');
  const [days, setDays] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [errors, setErrors] = useState<TripErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus('planned');
    setDays('7');
    setStartDate('');
    setTitleEdited(false);
    setErrors({});
  }, [open, country.id]);

  // "Japan Oktober": follows the start date's month until the title is edited by hand.
  const dated = status !== 'idea' && startDate ? startDate : null;
  useEffect(() => {
    if (!titleEdited) setTitle(defaultTripTitle(country.name, dated, today));
  }, [titleEdited, country.name, dated, today]);

  const changeStatus = (next: TripStatus) => {
    setStatus(next);
    setErrors((e) => ({ ...e, startDate: undefined }));
    if (next === 'traveling' && !startDate) setStartDate(today);
  };

  const dayCount = Number.parseInt(days, 10);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = validateTrip({ countryId: country.id, title, days, status, startDate: startDate || null });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setSaving(true);
    try {
      const id = await createTrip(checked.value);
      notify(`„${checked.value.title}“ angelegt, mit ${checked.value.days} ${checked.value.days === 1 ? 'Tag' : 'Tagen'} im Tagesplan`);
      onCreated(id);
    } catch (error) {
      reportError('Reise konnte nicht angelegt werden')(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Neue Reise"
      description={
        Number.isInteger(dayCount) && dayCount > 0
          ? `Die Tage 1 bis ${dayCount} stehen danach gleich im Tagesplan.`
          : 'Die Tage stehen danach gleich im Tagesplan.'
      }
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.country}>
          <span className={styles.countryLabel}>Land</span>
          <span className={styles.countryName}>
            <span className={styles.dot} aria-hidden />
            {country.name}
          </span>
          <span className={styles.continent}>{continentName(country.continent)}</span>
        </div>

        <TextField
          label="Titel"
          value={title}
          maxLength={80}
          error={errors.title}
          data-autofocus=""
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleEdited(true);
            setErrors((x) => ({ ...x, title: undefined }));
          }}
        />

        <div className={styles.status}>
          <span className={styles.label} aria-hidden>
            Status
          </span>
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
        </div>

        <div className={styles.row}>
          <TextField
            className={styles.days}
            label="Tage"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={days}
            error={errors.days}
            onChange={(e) => {
              setDays(e.target.value);
              setErrors((x) => ({ ...x, days: undefined }));
            }}
          />
          {status === 'idea' ? (
            <p className={styles.ideaHint}>Eine Idee braucht noch kein Startdatum. Die Tage bleiben ohne Datum, bis du planst.</p>
          ) : (
            <TextField
              className={styles.date}
              label="Startdatum"
              type="date"
              value={startDate}
              error={errors.startDate}
              hint={status === 'traveling' ? 'Für den Fortschritt unterwegs nötig' : 'Optional'}
              onChange={(e) => {
                setStartDate(e.target.value);
                setErrors((x) => ({ ...x, startDate: undefined }));
              }}
            />
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            Reise anlegen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
