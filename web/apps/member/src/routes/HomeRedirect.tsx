// The member app's landing and not-found routes.
import { EmptyState, useDocumentTitle } from '@booking-kiosk/ui';
import { Link, Navigate } from 'react-router';
import { useViewer } from './viewer';

/** Sends a signed-in person to their first workspace. */
export function HomeRedirect() {
  const viewer = useViewer();
  const first = viewer.memberships[0];
  if (!first) {
    return (
      <main className="k-main" id="main">
        <EmptyState title="No workspaces yet">
          <p>Ask a makerspace manager to add you as a member.</p>
        </EmptyState>
      </main>
    );
  }
  return <Navigate to={`/w/${first.workspace.slug}`} replace />;
}

/** Shown for any URL the member app does not know. */
export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <main className="k-main" id="main">
      <EmptyState title="Page not found">
        <Link to="/">Go to your workspace</Link>
      </EmptyState>
    </main>
  );
}
