// The booking page: day strip, the slot grid for every machine, and the hold tray.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  availabilityQuery,
  describeFailure,
  firstUserError,
  placeHoldMutation,
} from '@booking-kiosk/api';
import {
  addDays,
  EmptyState,
  ErrorNotice,
  formatLongDay,
  formatTime,
  LoadingBlock,
  Notice,
  useDocumentTitle,
} from '@booking-kiosk/ui';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { useWorkspace, useWorkspaceToday } from '../routes/workspace';
import { DayStrip } from './DayStrip';
import { HoldTray } from './HoldTray';
import { holdErrorMessage, presentSlot } from './slots';

const REFRESH_MS = 30_000;

/**
 * Shows each in-service machine's slots for the chosen day and holds a free
 * slot when it is clicked.
 *
 * @remarks
 * The grid polls every 30 seconds and refetches after every hold attempt, so a
 * slot someone else just took shows as taken at once. A lost race comes back
 * as `SLOT_TAKEN` and is explained in words; the new hold is announced in a
 * status region and its Confirm button takes focus.
 * @see docs/explanation/concurrency-and-holds.md
 */
export function BookPage() {
  const workspace = useWorkspace();
  useDocumentTitle('Book a machine', workspace.name);
  const today = useWorkspaceToday(workspace);
  const lastDay = addDays(today, workspace.bookingHorizonDays - 1);
  const [chosen, setChosen] = useState<string | null>(null);
  // A day chosen before midnight that has since passed falls back to today.
  const date = chosen && chosen >= today && chosen <= lastDay ? chosen : today;
  const [problem, setProblem] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [newHoldId, setNewHoldId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(availabilityQuery, {
    variables: { slug: workspace.slug, date },
    pollInterval: REFRESH_MS,
    fetchPolicy: 'cache-and-network',
  });
  const [placeHold, holdState] = useMutation(placeHoldMutation, { refetchQueries: ['MyHolds'] });

  const hold = async (machineName: string, machineId: string, startsAt: string) => {
    setProblem(null);
    setAnnouncement('');
    try {
      const result = await placeHold({ variables: { machineId, startsAt } });
      const failure = firstUserError(result.data?.placeHold.errors);
      const booking = result.data?.placeHold.booking;
      if (failure) {
        setProblem(holdErrorMessage(failure.code, failure.message));
      } else if (booking) {
        setNewHoldId(booking.id);
        setAnnouncement(
          `${machineName} at ${formatTime(startsAt, workspace.timeZone)} is held for ${workspace.holdMinutes} minutes. Confirm it under Your holds.`,
        );
      }
    } catch (failure) {
      setProblem(describeFailure(failure));
    }
    // A failed (or abandoned) refresh shows up through the query's own error state.
    await refetch().catch(() => undefined);
  };

  const machines = data?.workspace?.availability ?? [];

  return (
    <div className="k-stack">
      <div className="book-heading">
        <h1 className="k-page-title">Book a machine</h1>
        <p className="k-muted">
          Open {workspace.opensAt}–{workspace.closesAt} ({workspace.timeZone}). Choosing a slot
          holds it for {workspace.holdMinutes} minutes while you confirm; you can hold up to{' '}
          {workspace.maxActiveHolds} at once.
        </p>
      </div>
      <DayStrip
        today={today}
        days={workspace.bookingHorizonDays}
        selected={date}
        onSelect={(next) => {
          setProblem(null);
          setChosen(next);
        }}
      />
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
      <HoldTray workspace={workspace} focusHoldId={newHoldId} onChanged={() => void refetch()} />
      {problem && <Notice tone="error">{problem}</Notice>}
      {loading && !data ? (
        <LoadingBlock label="Loading availability" lines={5} />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : machines.length === 0 ? (
        <EmptyState title="No machines to book" icon={<Wrench size={28} aria-hidden="true" />}>
          <p>This workspace has no machines in service yet.</p>
        </EmptyState>
      ) : (
        <div className="k-stack">
          <h2 className="visually-hidden">{formatLongDay(date)}</h2>
          {machines.map(({ machine, slots }) => (
            <div
              key={machine.id}
              className="k-card machine-lane"
              role="group"
              aria-labelledby={`machine-${machine.id}`}
            >
              <div className="machine-info">
                <h3 id={`machine-${machine.id}`}>{machine.name}</h3>
                <p className="k-muted">{machine.description}</p>
                <p className="k-muted k-mono">{machine.slotMinutes}-minute slots</p>
              </div>
              <ul className="slot-grid">
                {slots.map((slot) => {
                  const look = presentSlot(slot.state);
                  const time = formatTime(slot.startsAt, workspace.timeZone);
                  return (
                    <li key={slot.startsAt}>
                      <button
                        type="button"
                        className={`slot slot-${look.tone}`}
                        disabled={!look.selectable || holdState.loading}
                        aria-label={`${machine.name}, ${time}, ${look.label}`}
                        onClick={() => void hold(machine.name, machine.id, slot.startsAt)}
                      >
                        {time}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
