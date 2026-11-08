// Loads one workspace and renders its navigation around the page for the URL.
import { useQuery } from '@apollo/client/react';
import { workspaceOverviewQuery } from '@booking-kiosk/api';
import { Button, EmptyState, ErrorNotice, LoadingBlock, useDocumentTitle } from '@booking-kiosk/ui';
import { useId, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router';
import { useWorkspace } from './workspace';
import { useViewer } from './viewer';

const MEMBER_TABS = [
  { to: '', label: 'Book', end: true },
  { to: 'bookings', label: 'My bookings', end: false },
] as const;

const MANAGER_TABS = [
  { to: 'manage/machines', label: 'Machines' },
  { to: 'manage/team', label: 'Team' },
  { to: 'manage/messages', label: 'Messages' },
  { to: 'manage/outbox', label: 'Outbox' },
  { to: 'manage/usage', label: 'Usage' },
] as const;

/** What a slug the viewer does not belong to shows (whether or not it exists). */
function NotAMember() {
  useDocumentTitle('Not a member');
  return (
    <main className="k-main" id="main">
      <EmptyState title="You are not a member of this workspace">
        <Link to="/">Go to your workspaces</Link>
      </EmptyState>
    </main>
  );
}

/**
 * A workspace picker that changes nothing until Go is pressed.
 *
 * @remarks
 * Choosing an option only changes the selection, so arrowing through the list
 * never navigates away (WCAG 3.2.2 On Input).
 */
function WorkspaceSwitcher({
  current,
  memberships,
}: {
  /** The slug of the workspace on screen. */
  current: string;
  /** Every workspace the viewer belongs to. */
  memberships: ReturnType<typeof useViewer>['memberships'];
}) {
  const navigate = useNavigate();
  const selectId = useId();
  const [choice, setChoice] = useState(current);
  return (
    <form
      className="member-switcher k-cluster"
      onSubmit={(e) => {
        e.preventDefault();
        if (choice !== current) void navigate(`/w/${choice}`);
      }}
    >
      <label htmlFor={selectId} className="visually-hidden">
        Workspace
      </label>
      <select
        id={selectId}
        className="k-select"
        value={choice}
        onChange={(e) => {
          setChoice(e.target.value);
        }}
      >
        {memberships.map((m) => (
          <option key={m.id} value={m.workspace.slug}>
            {m.workspace.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary">
        Go
      </Button>
    </form>
  );
}

/**
 * Loads the workspace named in the URL and shows its tabs and the routed page.
 *
 * @remarks
 * A slug the viewer does not belong to comes back as a null workspace (the API
 * does not say whether it exists), so the page shows "not a member". Tabs are
 * chosen by role for clarity only; the API checks every role itself.
 * @see docs/reference/features.md
 */
export function WorkspaceLayout() {
  const { slug = '' } = useParams();
  const viewer = useViewer();
  const { data, loading, error, refetch } = useQuery(workspaceOverviewQuery, {
    variables: { slug },
  });

  if (loading && !data) {
    return (
      <main className="k-main" id="main">
        <LoadingBlock label="Loading workspace" />
      </main>
    );
  }
  if (error) {
    return (
      <main className="k-main" id="main">
        <ErrorNotice error={error} onRetry={refetch} />
      </main>
    );
  }
  const workspace = data?.workspace;
  if (!workspace) return <NotAMember />;

  const isManager = workspace.viewerRole === 'MANAGER';
  const canBook = workspace.viewerRole !== 'STAFF';

  return (
    <>
      <nav className="member-nav" aria-label="Workspace">
        {viewer.memberships.length > 1 ? (
          <WorkspaceSwitcher key={slug} current={slug} memberships={viewer.memberships} />
        ) : (
          <strong>{workspace.name}</strong>
        )}
        <ul className="k-tabs">
          {canBook &&
            MEMBER_TABS.map((tab) => (
              <li key={tab.label}>
                <NavLink className="k-tab" to={tab.to} end={tab.end}>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          {isManager &&
            MANAGER_TABS.map((tab) => (
              <li key={tab.label}>
                <NavLink className="k-tab" to={tab.to}>
                  {tab.label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
      <main className="k-main" id="main">
        {canBook || isManager ? (
          <Outlet context={{ workspace }} />
        ) : (
          <EmptyState title="Staff accounts use the front-desk kiosk">
            <p>Open the kiosk app to see today&apos;s bookings.</p>
          </EmptyState>
        )}
      </main>
    </>
  );
}

/**
 * Wraps manager-only pages: sets the page title, and shows members who type
 * the URL a clear message instead of the page.
 */
export function ManagerOnly({
  title,
  children,
}: {
  /** The page's name, for `document.title`. */
  title: string;
  /** The manager page. */
  children: ReactNode;
}) {
  const workspace = useWorkspace();
  useDocumentTitle(title, workspace.name);
  if (workspace.viewerRole !== 'MANAGER') {
    return (
      <EmptyState title="Managers only">You need the manager role to see this page.</EmptyState>
    );
  }
  return children;
}
