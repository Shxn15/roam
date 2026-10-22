import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './TextField.module.css';

interface FieldFrameProps {
  label: string;
  hideLabel?: boolean;
  /** Shown below the field and announced; marks the field invalid. */
  error?: string;
  /** Quiet help text below the field (hidden while there is an error). */
  hint?: ReactNode;
  className?: string;
}

function useFieldIds(id: string | undefined) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return { inputId, messageId: `${inputId}-message` };
}

function Message({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} className={styles.error} role="alert">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={id} className={styles.hint}>
      {hint}
    </p>
  ) : null;
}

type TextFieldProps = FieldFrameProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hideLabel, error, hint, className, id, ...rest }: TextFieldProps) {
  const { inputId, messageId } = useFieldIds(id);
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...rest}
      />
      <Message id={messageId} error={error} hint={hint} />
    </div>
  );
}

type TextAreaProps = FieldFrameProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ label, hideLabel, error, hint, className, id, rows = 3, ...rest }: TextAreaProps) {
  const { inputId, messageId } = useFieldIds(id);
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        className={cx(styles.input, styles.textarea)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...rest}
      />
      <Message id={messageId} error={error} hint={hint} />
    </div>
  );
}
