// An error message with an optional Try again action.
import { describeFailure } from '@booking-kiosk/api';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Notice } from './Notice';

/**
 * An error notice with a plain-words message and, when given `onRetry`, a Try
 * again button. A retry that fails again shows up through the caller's own
 * error state, so its rejection is not left unhandled here.
 */
export function ErrorNotice({
  error,
  onRetry,
  children,
}: {
  /** The failure; its message is shown through `describeFailure` unless `children` is given. */
  error: unknown;
  /** Shows a Try again button that calls this, such as a query's `refetch`. */
  onRetry?: () => unknown;
  /** Replaces the default message. */
  children?: ReactNode;
}) {
  return (
    <Notice tone="error">
      {children ?? describeFailure(error)}{' '}
      {onRetry && (
        <Button
          variant="ghost"
          onClick={() => {
            void Promise.resolve(onRetry()).catch(() => undefined);
          }}
        >
          Try again
        </Button>
      )}
    </Notice>
  );
}
