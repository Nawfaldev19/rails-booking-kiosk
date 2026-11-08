// Inline status and error messages with the right live-region role.
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'error' | 'success';

const ICONS = { info: Info, error: CircleAlert, success: CircleCheck } as const;

/**
 * Inline message. Errors are announced immediately (`role="alert"`); the rest
 * politely (`role="status"`). The tone is shown by an icon as well as colour.
 */
export function Notice({
  tone = 'info',
  id,
  children,
}: {
  /** Which icon, colour and live-region role to use. @defaultValue `'info'` */
  tone?: Tone;
  /** Lets a form control point at the message with `aria-describedby`. */
  id?: string;
  /** The message. */
  children: ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      id={id}
      className={`k-notice k-notice-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
