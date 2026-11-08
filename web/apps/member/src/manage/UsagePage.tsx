// Manager page: confirmed hours per machine over the last 14 days.
import { useQuery } from '@apollo/client/react';
import { utilisationQuery } from '@booking-kiosk/api';
import { EmptyState, ErrorNotice, LoadingBlock } from '@booking-kiosk/ui';
import { useId } from 'react';
import { ManagerOnly } from '../routes/WorkspaceLayout';
import { useWorkspace } from '../routes/workspace';

function UsageContent() {
  const workspace = useWorkspace();
  const captionId = useId();
  const { data, loading, error, refetch } = useQuery(utilisationQuery, {
    variables: { slug: workspace.slug },
  });
  const usage = data?.workspace?.utilisation ?? [];
  const max = Math.max(1, ...usage.map((u) => u.bookedHours));

  return (
    <div className="k-stack">
      <h1 className="k-page-title">Usage</h1>
      <p className="k-muted">Confirmed hours per machine over the last 14 days.</p>
      {loading && !data ? (
        <LoadingBlock label="Loading usage" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : usage.length === 0 ? (
        <EmptyState title="No machines in service" />
      ) : (
        <div className="k-table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
          <table className="usage-table">
            <caption id={captionId} className="visually-hidden">
              Booked hours per machine, last 14 days
            </caption>
            <thead>
              <tr>
                <th scope="col">Machine</th>
                <th scope="col" className="k-num">
                  Hours
                </th>
                <th scope="col" className="k-num">
                  Bookings
                </th>
                <th scope="col" aria-hidden="true" className="usage-bar-cell" />
              </tr>
            </thead>
            <tbody>
              {usage.map((entry) => (
                <tr key={entry.machine.id}>
                  <th>{entry.machine.name}</th>
                  <td className="k-mono k-num">{entry.bookedHours.toFixed(1)}</td>
                  <td className="k-mono k-num">{entry.bookingCount}</td>
                  <td aria-hidden="true" className="usage-bar-cell">
                    <span
                      className="usage-bar"
                      style={{ width: `${(entry.bookedHours / max) * 100}%` }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** The manager's Usage page: one bar per in-service machine, with the hours as text. */
export function UsagePage() {
  return (
    <ManagerOnly title="Usage">
      <UsageContent />
    </ManagerOnly>
  );
}
