// A small status label, such as Held, Confirmed or Arrived.
import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

/** Status is always shown as an icon plus text, never colour alone. */
export function StatusPill({
  tone,
  icon,
  children,
}: {
  /** The colour family. */
  tone: Tone;
  /** An icon before the text, so the status does not depend on colour (WCAG 1.4.1). */
  icon?: ReactNode;
  /** The status text. */
  children: ReactNode;
}) {
  return (
    <span className={`k-pill k-pill-${tone}`}>
      {icon}
      {children}
    </span>
  );
}
