// The one button component, so variants, busy state and focus styles stay consistent.
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Props for {@link Button}; every native button attribute is passed through. */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. @defaultValue `'secondary'` */
  readonly variant?: Variant;
  /** An icon before the label; mark it `aria-hidden` when the label already says it all. */
  readonly icon?: ReactNode;
  /** Disables the button and sets `aria-busy` while an action is running. */
  readonly busy?: boolean;
  /** Lets callers move focus to the button after an action. */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * A native `<button>` with Booking Kiosk's styles.
 *
 * @remarks
 * `type` defaults to `button`, so a button inside a form never submits it by
 * accident; pass `type="submit"` for the one that should.
 */
export function Button({
  variant = 'secondary',
  icon,
  busy = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`k-button k-button-${variant}${className ? ` ${className}` : ''}`}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
