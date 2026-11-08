// A labelled text input with an optional hint and error, wired up for assistive technology.
import { useId, type InputHTMLAttributes } from 'react';

/** Props for {@link TextField}; every native input attribute except `id` is passed through. */
interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** The visible label, tied to the input with `for`/`id`. */
  readonly label: string;
  /** A field error from the API; sets `aria-invalid` and is linked by `aria-describedby`. */
  readonly error?: string | null;
  /** Help text under the input, also linked by `aria-describedby`. */
  readonly hint?: string;
}

/**
 * A text input with a programmatic label, hint and error.
 *
 * @remarks
 * The `id` comes from `useId`, so two fields with the same label never clash.
 */
export function TextField({ label, error, hint, ...input }: TextFieldProps) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="k-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="k-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint && (
        <span id={`${id}-hint`} className="k-field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="k-field-error">
          {error}
        </span>
      )}
    </div>
  );
}
