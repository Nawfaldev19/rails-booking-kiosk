// The front-desk page: today's expected and arrived lists, search and arrival marking.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  daySheetQuery,
  describeFailure,
  errorCode,
  firstUserError,
  markArrivalMutation,
} from '@booking-kiosk/api';
import {
  Button,
  EmptyState,
  ErrorNotice,
  formatLongDay,
  formatTimeRange,
  LoadingBlock,
  Notice,
  useDocumentTitle,
} from '@booking-kiosk/ui';
import { CalendarCheck, Search, UserCheck, Undo2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { splitDaySheet, type DaySheetEntry } from './daySheet';

const REFRESH_MS = 30_000;

type Pane = 'expected' | 'arrived';

/** One booking on the desk list with its Arrived / Undo button. */
function EntryCard({
  entry,
  timeZone,
  busy,
  buttonRef,
  onToggle,
}: {
  entry: DaySheetEntry;
  timeZone: string;
  busy: boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onToggle: (entry: DaySheetEntry) => void;
}) {
  const arrived = Boolean(entry.arrivedAt);
  // One member can have several bookings today, so the name includes the machine and time.
  const which = `${entry.machine.name}, ${formatTimeRange(entry.startsAt, entry.endsAt, timeZone)}`;
  return (
    <li className="desk-card">
      <span className="desk-time k-mono">
        {formatTimeRange(entry.startsAt, entry.endsAt, timeZone)}
      </span>
      <span className="desk-who">
        <strong>{entry.member.name}</strong>
        <span className="k-muted">{entry.machine.name}</span>
      </span>
      <Button
        variant={arrived ? 'ghost' : 'primary'}
        busy={busy}
        ref={buttonRef}
        icon={
          arrived ? (
            <Undo2 size={16} aria-hidden="true" />
          ) : (
            <UserCheck size={16} aria-hidden="true" />
          )
        }
        aria-label={
          arrived
            ? `Undo arrival for ${entry.member.name}, ${which}`
            : `Mark ${entry.member.name} as arrived, ${which}`
        }
        onClick={() => {
          onToggle(entry);
        }}
      >
        {arrived ? 'Undo' : 'Arrived'}
      </Button>
    </li>
  );
}

function NotAvailable() {
  useDocumentTitle('Not available', 'Front desk');
  return (
    <main className="k-main" id="main">
      <EmptyState title="Not available">
        <p>You are not front-desk staff for this workspace.</p>
        <Link to="/">Choose another workspace</Link>
      </EmptyState>
    </main>
  );
}

/**
 * Today's bookings for one workspace, split into Expected and Arrived.
 *
 * @remarks
 * The list polls every 30 seconds; a failed refresh keeps the last list under a
 * warning with Try again. Marking an arrival is announced and moves focus to the
 * next person, so staff can work through the list from the keyboard. Members
 * get `FORBIDDEN` from the API and see "Not available".
 */
export function DeskPage() {
  const { slug = '' } = useParams();
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [pane, setPane] = useState<Pane>('expected');
  const [problem, setProblem] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const { data, previousData, loading, error, refetch } = useQuery(daySheetQuery, {
    variables: { slug },
    pollInterval: REFRESH_MS,
    fetchPolicy: 'cache-and-network',
  });
  const [markArrival] = useMutation(markArrivalMutation);
  useDocumentTitle('Front desk', (data ?? previousData)?.workspace?.name ?? '');
  // Toggling moves a card to the other list, so focus moves on to the next person.
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const searchBox = useRef<HTMLInputElement>(null);

  // A failed refresh keeps the last list on screen rather than blanking the desk.
  const shown = data ?? previousData;
  if (loading && !shown) {
    return (
      <main className="k-main" id="main">
        <LoadingBlock label="Loading today's bookings" lines={6} />
      </main>
    );
  }
  if (errorCode(error) === 'FORBIDDEN') return <NotAvailable />;
  if (error && !shown) {
    return (
      <main className="k-main" id="main">
        <ErrorNotice error={error} onRetry={refetch} />
      </main>
    );
  }
  const workspace = shown?.workspace;
  if (!workspace) return <NotAvailable />;

  const sheet = splitDaySheet(workspace.daySheet, search);
  const percent = sheet.total === 0 ? 0 : Math.round((sheet.arrivedCount / sheet.total) * 100);

  const toggle = async (entry: DaySheetEntry) => {
    const list = entry.arrivedAt ? sheet.arrived : sheet.expected;
    const index = list.findIndex((e) => e.id === entry.id);
    const next = list[index + 1] ?? list[index - 1];
    setProblem(null);
    setAnnouncement('');
    setPending(entry.id);
    try {
      const result = await markArrival({
        variables: { bookingId: entry.id, arrived: !entry.arrivedAt },
      });
      const failure = firstUserError(result.data?.markArrival.errors);
      if (failure) {
        setProblem(failure.message);
      } else {
        setAnnouncement(
          entry.arrivedAt
            ? `${entry.member.name} moved back to expected.`
            : `${entry.member.name} marked as arrived.`,
        );
        const target = next ? buttons.current.get(next.id) : undefined;
        (target ?? searchBox.current)?.focus();
      }
    } catch (failure) {
      setProblem(describeFailure(failure));
    } finally {
      setPending(null);
    }
  };

  const list = (entries: readonly DaySheetEntry[], empty: string) =>
    entries.length === 0 ? (
      <p className="k-muted desk-empty">{empty}</p>
    ) : (
      <ul className="desk-list">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            timeZone={workspace.timeZone}
            busy={pending === entry.id}
            buttonRef={(node) => {
              if (node) buttons.current.set(entry.id, node);
              else buttons.current.delete(entry.id);
            }}
            onToggle={(e) => void toggle(e)}
          />
        ))}
      </ul>
    );

  return (
    <main className="k-main k-stack" id="main">
      <div className="desk-heading">
        <div>
          <h1 className="k-page-title">{workspace.name}</h1>
          <p className="k-muted">{formatLongDay(workspace.today)}</p>
        </div>
        <div className="desk-progress">
          <span className="k-mono" aria-hidden="true">
            {sheet.arrivedCount} / {sheet.total} arrived
          </span>
          <progress
            max={sheet.total || 1}
            value={sheet.arrivedCount}
            aria-label="Members arrived"
            aria-valuetext={`${sheet.arrivedCount} of ${sheet.total} members arrived`}
          >
            {percent}%
          </progress>
        </div>
      </div>

      {error && (
        <ErrorNotice error={error} onRetry={refetch}>
          Could not refresh the list, so it may be out of date. {describeFailure(error)}
        </ErrorNotice>
      )}
      <p role="status" className="visually-hidden">
        {announcement}
      </p>

      {sheet.total === 0 ? (
        <EmptyState
          title="No bookings today"
          icon={<CalendarCheck size={28} aria-hidden="true" />}
        />
      ) : (
        <>
          <div className="desk-search">
            <Search size={18} aria-hidden="true" />
            <label htmlFor={searchId} className="visually-hidden">
              Search by member or machine
            </label>
            <input
              id={searchId}
              ref={searchBox}
              type="search"
              className="k-input"
              placeholder="Search by member or machine"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
          {problem && <Notice tone="error">{problem}</Notice>}
          <div className="desk-switch" role="group" aria-label="Show list">
            <Button
              variant="ghost"
              aria-pressed={pane === 'expected'}
              onClick={() => {
                setPane('expected');
              }}
            >
              Expected ({sheet.expected.length})
            </Button>
            <Button
              variant="ghost"
              aria-pressed={pane === 'arrived'}
              onClick={() => {
                setPane('arrived');
              }}
            >
              Arrived ({sheet.arrived.length})
            </Button>
          </div>
          <div className="desk-columns" data-pane={pane}>
            <div
              className="desk-column desk-expected"
              role="region"
              aria-labelledby="expected-heading"
            >
              <h2 id="expected-heading">Expected ({sheet.expected.length})</h2>
              {list(
                sheet.expected,
                search ? 'No one expected matches that search.' : 'Everyone has arrived.',
              )}
            </div>
            <div
              className="desk-column desk-arrived"
              role="region"
              aria-labelledby="arrived-heading"
            >
              <h2 id="arrived-heading">Arrived ({sheet.arrived.length})</h2>
              {list(
                sheet.arrived,
                search ? 'No one arrived matches that search.' : 'No arrivals yet.',
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
