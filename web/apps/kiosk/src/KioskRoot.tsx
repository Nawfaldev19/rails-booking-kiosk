// The kiosk shell: sign-in for staff, the header, and the choice of workspace.
import { useQuery } from '@apollo/client/react';
import { viewerQuery, type ViewerQuery as ViewerData } from '@booking-kiosk/api';
import {
  AppHeader,
  EmptyState,
  ErrorNotice,
  LoadingBlock,
  Notice,
  SignInPanel,
  useDocumentTitle,
  useSignOut,
} from '@booking-kiosk/ui';
import { Link, Navigate, Outlet, useNavigate, useOutletContext } from 'react-router';

type Viewer = NonNullable<ViewerData['viewer']>;

/** Workspaces where the viewer may run the front desk. */
function deskMemberships(viewer: Viewer) {
  return viewer.memberships.filter((m) => m.role === 'STAFF' || m.role === 'MANAGER');
}

/**
 * Shows sign-in until someone is signed in, then the header and the routed page.
 *
 * @remarks
 * The viewer goes to child routes through the outlet context. Which workspaces
 * the kiosk offers is a display choice; the API refuses the day sheet to members.
 */
export function KioskRoot() {
  const { data, loading, error, refetch } = useQuery(viewerQuery);
  const navigate = useNavigate();
  const { signOut, problem } = useSignOut(async () => {
    await navigate('/');
    await refetch();
  });

  if (loading && !data) {
    return (
      <main className="k-main" id="main">
        <LoadingBlock label="Loading" />
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

  const viewer = data?.viewer;
  if (!viewer) return <KioskSignIn />;

  return (
    <div className="k-shell">
      <AppHeader
        product="Front desk"
        homeHref="/"
        userName={viewer.user.name}
        onSignOut={() => void signOut()}
      />
      {problem && <Notice tone="error">{problem}</Notice>}
      <Outlet context={{ viewer }} />
    </div>
  );
}

/** The kiosk's signed-out page: what it is for, and the sign-in form. */
function KioskSignIn() {
  useDocumentTitle('Sign in', 'Front desk');
  return (
    <div className="k-shell">
      <AppHeader product="Front desk" homeHref="/" />
      <main className="k-main k-survey kiosk-landing" id="main">
        <SignInPanel
          heading="Front desk"
          intro={
            <p>
              For makerspace staff: see today&apos;s bookings, find a member quickly, and mark them
              as arrived. Lists refresh on their own every 30 seconds.
            </p>
          }
          demoAccounts={[
            { label: 'Jules (staff)', email: 'jules@example.com' },
            { label: 'Robin (manager)', email: 'robin@example.com' },
          ]}
        />
      </main>
    </div>
  );
}

/**
 * Lists the workspaces where the viewer is staff or a manager, and goes straight
 * to the only one when there is just one.
 */
export function WorkspacePicker() {
  const { viewer } = useOutletContext<{ viewer: Viewer }>();
  useDocumentTitle('Choose a workspace', 'Front desk');
  const desks = deskMemberships(viewer);
  const only = desks.length === 1 ? desks[0] : undefined;
  if (only) return <Navigate to={`/w/${only.workspace.slug}`} replace />;
  return (
    <main className="k-main" id="main">
      {desks.length === 0 ? (
        <EmptyState title="No front-desk access">
          <p>
            Your account is not staff or a manager in any workspace. Members book in the member app.
          </p>
        </EmptyState>
      ) : (
        <div className="k-stack">
          <h1 className="k-page-title">Choose a workspace</h1>
          <ul className="desk-picker">
            {desks.map((m) => (
              <li key={m.id}>
                <Link className="k-card desk-picker-link" to={`/w/${m.workspace.slug}`}>
                  {m.workspace.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
