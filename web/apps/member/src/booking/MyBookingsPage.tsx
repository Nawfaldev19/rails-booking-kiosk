// The member's upcoming and past bookings, with a two-step cancel.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  cancelBookingMutation,
  describeFailure,
  firstUserError,
  myBookingsQuery,
  type BookingStatus,
} from '@booking-kiosk/api';
import {
  Button,
  dateInZone,
  EmptyState,
  ErrorNotice,
  formatLongDay,
  formatTimeRange,
  LoadingBlock,
  Notice,
  StatusPill,
  useDocumentTitle,
  useNow,
} from '@booking-kiosk/ui';
import { CalendarCheck, CalendarX, Clock3 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useWorkspace } from '../routes/workspace';

const STATUS: Readonly<
  Record<BookingStatus, { tone: 'success' | 'warning' | 'muted'; label: string }>
> = {
  CONFIRMED: { tone: 'success', label: 'Confirmed' },
  HELD: { tone: 'warning', label: 'Held' },
  CANCELLED: { tone: 'muted', label: 'Cancelled' },
  RELEASED: { tone: 'muted', label: 'Released' },
  LAPSED: { tone: 'muted', label: 'Lapsed' },
};

/**
 * Lists the viewer's upcoming or past bookings, ten at a time, with Load more.
 *
 * @remarks
 * Cancel asks for confirmation first and keeps focus on the list; it is not
 * offered once a booking has started (the API refuses that as well).
 */
export function MyBookingsPage() {
  const workspace = useWorkspace();
  useDocumentTitle('My bookings', workspace.name);
  const now = useNow(30_000);
  const [upcoming, setUpcoming] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const { data, loading, error, refetch, fetchMore } = useQuery(myBookingsQuery, {
    variables: { slug: workspace.slug, upcoming },
    fetchPolicy: 'cache-and-network',
  });
  const [cancel, cancelState] = useMutation(cancelBookingMutation);
  const connection = data?.workspace?.myBookings;
  // Where keyboard focus goes once the confirm buttons unmount.
  const listItems = useRef(new Map<string, HTMLLIElement>());
  const returnFocusTo = useRef<string | null>(null);
  const focusedConfirm = useRef<string | null>(null);

  const cancelBooking = async (bookingId: string) => {
    setMessage(null);
    try {
      const result = await cancel({ variables: { bookingId } });
      const failure = firstUserError(result.data?.cancelBooking.errors);
      setMessage(
        failure
          ? { tone: 'error', text: failure.message }
          : { tone: 'success', text: 'Booking cancelled.' },
      );
    } catch (failure) {
      setMessage({ tone: 'error', text: describeFailure(failure) });
    }
    setConfirming(null);
    listItems.current.get(bookingId)?.focus();
  };

  return (
    <div className="k-stack">
      <h1 className="k-page-title">My bookings</h1>
      <div className="k-cluster" role="group" aria-label="Which bookings">
        <Button
          variant="ghost"
          aria-pressed={upcoming}
          onClick={() => {
            setUpcoming(true);
          }}
        >
          Upcoming
        </Button>
        <Button
          variant="ghost"
          aria-pressed={!upcoming}
          onClick={() => {
            setUpcoming(false);
          }}
        >
          Past
        </Button>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {loading && !connection ? (
        <LoadingBlock label="Loading bookings" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : !connection || connection.nodes.length === 0 ? (
        <EmptyState
          title={upcoming ? 'Nothing booked yet' : 'No past bookings'}
          icon={<CalendarCheck size={28} aria-hidden="true" />}
        >
          {upcoming && <p>Pick a machine and a slot on the Book tab.</p>}
        </EmptyState>
      ) : (
        <ul className="booking-list">
          {connection.nodes.map((booking) => {
            const status = STATUS[booking.status];
            // A booking that has started can no longer be cancelled, so do not offer it.
            const canCancel =
              upcoming && booking.status === 'CONFIRMED' && Date.parse(booking.startsAt) > now;
            const when = `${formatLongDay(dateInZone(booking.startsAt, workspace.timeZone))}, ${formatTimeRange(booking.startsAt, booking.endsAt, workspace.timeZone)}`;
            // Each list entry has its own buttons, so their names say which booking they act on.
            const which = `${booking.machine.name}, ${when}`;
            return (
              <li
                key={booking.id}
                className="k-card booking-item"
                tabIndex={-1}
                ref={(node) => {
                  if (node) listItems.current.set(booking.id, node);
                  else listItems.current.delete(booking.id);
                }}
              >
                <div>
                  <strong>{booking.machine.name}</strong>
                  <p className="k-muted">{when}</p>
                </div>
                <StatusPill
                  tone={status.tone}
                  icon={
                    booking.status === 'CANCELLED' ? (
                      <CalendarX size={14} aria-hidden="true" />
                    ) : (
                      <Clock3 size={14} aria-hidden="true" />
                    )
                  }
                >
                  {status.label}
                </StatusPill>
                {canCancel &&
                  (confirming === booking.id ? (
                    <div className="k-cluster">
                      <Button
                        variant="danger"
                        busy={cancelState.loading}
                        ref={(node: HTMLButtonElement | null) => {
                          if (node && focusedConfirm.current !== booking.id) {
                            focusedConfirm.current = booking.id;
                            node.focus();
                          }
                        }}
                        aria-label={`Yes, cancel it: ${which}`}
                        onClick={() => void cancelBooking(booking.id)}
                      >
                        Yes, cancel it
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Keep booking: ${which}`}
                        onClick={() => {
                          returnFocusTo.current = booking.id;
                          setConfirming(null);
                        }}
                      >
                        Keep booking
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      ref={(node: HTMLButtonElement | null) => {
                        if (node && returnFocusTo.current === booking.id) {
                          returnFocusTo.current = null;
                          node.focus();
                        }
                      }}
                      aria-label={`Cancel ${which}…`}
                      onClick={() => {
                        focusedConfirm.current = null;
                        setConfirming(booking.id);
                      }}
                    >
                      Cancel…
                    </Button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
      {connection?.pageInfo.hasNextPage && (
        <Button
          variant="secondary"
          busy={loading}
          onClick={() => void fetchMore({ variables: { after: connection.pageInfo.endCursor } })}
        >
          Load more
        </Button>
      )}
    </div>
  );
}
