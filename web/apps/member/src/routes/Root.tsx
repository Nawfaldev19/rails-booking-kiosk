// The member app shell: loads the viewer and chooses between sign-in and the app.
import { useQuery } from '@apollo/client/react';
import { viewerQuery } from '@booking-kiosk/api';
import { AppHeader, ErrorNotice, LoadingBlock, Notice, useSignOut } from '@booking-kiosk/ui';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { RouteAnnouncer } from './RouteAnnouncer';
import type { RootContext } from './viewer';
import { SignInLanding } from './SignInLanding';

/** Decides between the sign-in landing view and the signed-in app. */
export function Root() {
  const { data, loading, error, refetch } = useQuery(viewerQuery);
  const navigate = useNavigate();
  const { signOut, problem } = useSignOut(async () => {
    await navigate('/');
    await refetch();
  });

  if (loading && !data) {
    return (
      <main className="k-main" id="main">
        <LoadingBlock label="Loading your account" />
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
  if (!viewer) return <SignInLanding />;

  const context: RootContext = { viewer };
  return (
    <div className="k-shell">
      <AppHeader
        product="Book a machine"
        homeHref="/"
        userName={viewer.user.name}
        onSignOut={() => void signOut()}
      >
        <NavLink className="k-header-link" to="/account">
          Account
        </NavLink>
      </AppHeader>
      {problem && <Notice tone="error">{problem}</Notice>}
      <Outlet context={context} />
      <RouteAnnouncer />
    </div>
  );
}
