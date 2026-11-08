// The viewer's open holds with live countdowns, Confirm, Release and Hold again.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  confirmBookingMutation,
  describeFailure,
  firstUserError,
  myHoldsQuery,
  placeHoldMutation,
  releaseHoldMutation,
  type UserErrorLike,
} from '@booking-kiosk/api';
import {
  Button,
  dateInZone,
  formatCountdown,
  formatLongDay,
  formatTime,
  formatTimeRange,
  secondsUntil,
  useServerNow,
} from '@booking-kiosk/ui';
import { Check, RotateCcw, Timer, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Workspace } from '../routes/workspace';

/** Screen readers hear one warning when a hold has less than this many seconds left. */
const WARN_AT_SECONDS = 60;

/**
 * Publishes the sticky tray's height as `--sticky-offset` (read by `scroll-padding-top`
 * in the UI kit's base styles) for as long as the tray is on screen.
 *
 * @remarks
 * Without it, tabbing through the slot grid could put the focused slot underneath
 * the tray (WCAG 2.4.11 Focus Not Obscured).
 */
function reserveScrollSpace(node: HTMLElement | null) {
  if (!node) return;
  const root = document.documentElement;
  const observer = new ResizeObserver(() => {
    // The tray sits 8px below the top; leave the same gap below it.
    root.style.setProperty('--sticky-offset', `${node.offsetHeight + 16}px`);
  });
  observer.observe(node);
  return () => {
    observer.disconnect();
    root.style.removeProperty('--sticky-offset');
  };
}

/** Props for {@link HoldTray}. */
interface HoldTrayProps {
  /** The current workspace (zone and slug). */
  readonly workspace: Workspace;
  /** Called after any action so the grid can refresh. */
  readonly onChanged: () => void;
  /** A hold just placed from the grid; its Confirm button takes focus when it appears. */
  readonly focusHoldId?: string | null;
}

/**
 * The viewer's open holds, each with a live countdown and confirm / release actions.
 *
 * @remarks
 * Renders nothing when there are no holds and no outcome to show. The countdown
 * runs on the server's clock; a polite live region warns once in the last
 * minute and again at expiry, when Confirm is replaced by Hold again.
 * @see docs/adr/0011-hold-countdowns-use-the-server-clock.md
 */
export function HoldTray({ workspace, onChanged, focusHoldId = null }: HoldTrayProps) {
  const { data, refetch } = useQuery(myHoldsQuery, {
    variables: { slug: workspace.slug },
    fetchPolicy: 'cache-and-network',
  });
  // Count down on the server's clock, so a fast or slow device clock does not
  // end a hold early (or let someone press Confirm after it has run out). The
  // query asks for serverTime so that each network answer refreshes the offset.
  const now = useServerNow();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirm] = useMutation(confirmBookingMutation);
  const [release] = useMutation(releaseHoldMutation);
  const [placeHold] = useMutation(placeHoldMutation);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const focusedHold = useRef<string | null>(null);

  const holds = data?.workspace?.myHolds ?? [];

  const act = async (key: string, run: () => Promise<UserErrorLike | null>, success: string) => {
    setMessage(null);
    setPending(key);
    try {
      const error = await run();
      setMessage(
        error ? { tone: 'error', text: error.message } : { tone: 'success', text: success },
      );
    } catch (failure) {
      setMessage({ tone: 'error', text: describeFailure(failure) });
    } finally {
      setPending(null);
    }
    await refetch().catch(() => undefined);
    onChanged();
    // The card the person was using may be gone now; keep their place on the outcome.
    messageRef.current?.focus();
  };

  if (holds.length === 0 && !message) return null;

  const label = (hold: (typeof holds)[number]) =>
    `${hold.machine.name}, ${formatTime(hold.startsAt, workspace.timeZone)}`;
  const warnings = holds.flatMap((hold) => {
    const remaining = secondsUntil(hold.holdExpiresAt ?? '', now);
    if (remaining === 0) return [`Your hold on ${label(hold)} has expired.`];
    if (remaining <= WARN_AT_SECONDS) return [`Less than a minute left to confirm ${label(hold)}.`];
    return [];
  });

  return (
    <aside className="hold-tray" aria-label="Your holds" ref={reserveScrollSpace}>
      {message && (
        <p
          ref={messageRef}
          tabIndex={-1}
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`hold-message hold-message-${message.tone}`}
        >
          {message.text}
        </p>
      )}
      <p role="status" className="visually-hidden">
        {warnings.join(' ')}
      </p>
      {holds.map((hold) => {
        const remaining = secondsUntil(hold.holdExpiresAt ?? '', now);
        const expired = remaining === 0;
        const date = dateInZone(hold.startsAt, workspace.timeZone);
        return (
          <div key={hold.id} className="hold-card">
            <Timer size={20} aria-hidden="true" />
            <div className="hold-text">
              <strong>{hold.machine.name}</strong>
              <span>
                {formatLongDay(date)},{' '}
                {formatTimeRange(hold.startsAt, hold.endsAt, workspace.timeZone)}
              </span>
              <span className={expired ? 'hold-expired' : 'k-mono'}>
                {expired ? 'Hold expired' : `Held for ${formatCountdown(remaining)}`}
              </span>
            </div>
            {expired ? (
              <div className="k-cluster">
                <Button
                  variant="primary"
                  busy={pending === `${hold.id}:again`}
                  icon={<RotateCcw size={16} aria-hidden="true" />}
                  aria-label={`Hold ${label(hold)} again`}
                  onClick={() =>
                    void act(
                      `${hold.id}:again`,
                      async () => {
                        const result = await placeHold({
                          variables: { machineId: hold.machine.id, startsAt: hold.startsAt },
                        });
                        return firstUserError(result.data?.placeHold.errors);
                      },
                      `Held again: ${label(hold)}.`,
                    )
                  }
                >
                  Hold again
                </Button>
                <Button variant="ghost" onClick={() => void refetch().catch(() => undefined)}>
                  Dismiss
                </Button>
              </div>
            ) : (
              <div className="k-cluster">
                <Button
                  variant="primary"
                  busy={pending === `${hold.id}:confirm`}
                  icon={<Check size={16} aria-hidden="true" />}
                  aria-label={`Confirm ${label(hold)}`}
                  ref={
                    hold.id === focusHoldId
                      ? (node: HTMLButtonElement | null) => {
                          if (node && focusedHold.current !== hold.id) {
                            focusedHold.current = hold.id;
                            node.focus();
                          }
                        }
                      : undefined
                  }
                  onClick={() =>
                    void act(
                      `${hold.id}:confirm`,
                      async () => {
                        const result = await confirm({ variables: { bookingId: hold.id } });
                        return firstUserError(result.data?.confirmBooking.errors);
                      },
                      `Booked: ${hold.machine.name}. A confirmation is on its way.`,
                    )
                  }
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  busy={pending === `${hold.id}:release`}
                  icon={<X size={16} aria-hidden="true" />}
                  aria-label={`Release ${label(hold)}`}
                  onClick={() =>
                    void act(
                      `${hold.id}:release`,
                      async () => {
                        const result = await release({ variables: { bookingId: hold.id } });
                        return firstUserError(result.data?.releaseHold.errors);
                      },
                      'Hold released.',
                    )
                  }
                >
                  Release
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
