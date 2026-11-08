// Manager page: recorded outbox messages, their delivery status and a retry for failures.
import { useMutation, useQuery } from '@apollo/client/react';
import { outboxQuery, retryMessageMutation, type MessageStatus } from '@booking-kiosk/api';
import {
  Button,
  EmptyState,
  ErrorNotice,
  formatDateTime,
  LoadingBlock,
  Notice,
  StatusPill,
} from '@booking-kiosk/ui';
import { ChevronRight, CircleAlert, CircleCheck, Hourglass, Inbox, RotateCcw } from 'lucide-react';
import { ManagerOnly } from '../routes/WorkspaceLayout';
import { useWorkspace } from '../routes/workspace';
import { useAction } from './useAction';

const STATUS: Readonly<
  Record<
    MessageStatus,
    { tone: 'success' | 'warning' | 'danger'; label: string; icon: typeof Inbox }
  >
> = {
  DELIVERED: { tone: 'success', label: 'Delivered', icon: CircleCheck },
  PENDING: { tone: 'warning', label: 'Pending', icon: Hourglass },
  FAILED: { tone: 'danger', label: 'Failed', icon: CircleAlert },
};

function OutboxContent() {
  const workspace = useWorkspace();
  const { data, loading, error, refetch, fetchMore } = useQuery(outboxQuery, {
    variables: { slug: workspace.slug },
    fetchPolicy: 'cache-and-network',
  });
  const [retryMessage, retryState] = useMutation(retryMessageMutation);
  const { message: outcome, run } = useAction();
  const outbox = data?.workspace?.outbox;
  return (
    <div className="k-stack">
      <h1 className="k-page-title">Outbox</h1>
      <p className="k-muted">
        Every message is recorded in the same database transaction as the booking change that caused
        it, then delivered in the background and retried, with growing pauses, if delivery fails.
        Times are in {workspace.timeZone}.
      </p>
      {outcome && <Notice tone={outcome.tone}>{outcome.text}</Notice>}
      {loading && !outbox ? (
        <LoadingBlock label="Loading outbox" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : !outbox || outbox.nodes.length === 0 ? (
        <EmptyState title="No messages yet" icon={<Inbox size={28} aria-hidden="true" />}>
          <p>Confirmations, cancellations and invitations will appear here.</p>
        </EmptyState>
      ) : (
        <ul className="booking-list">
          {outbox.nodes.map((message) => {
            const status = STATUS[message.status];
            const Icon = status.icon;
            return (
              <li key={message.id} className="k-card">
                <details>
                  <summary className="outbox-summary">
                    <span className="outbox-title">
                      <ChevronRight size={16} aria-hidden="true" className="outbox-chevron" />
                      <span>
                        <strong>{message.subject}</strong>
                        <span className="k-muted"> to {message.recipient}</span>
                      </span>
                    </span>
                    <StatusPill tone={status.tone} icon={<Icon size={14} aria-hidden="true" />}>
                      {status.label}
                      {message.attempts > 1 ? ` after ${message.attempts} tries` : ''}
                    </StatusPill>
                  </summary>
                  <p className="k-muted">
                    {formatDateTime(message.createdAt, workspace.timeZone)}
                    {message.usedFallbackTemplate &&
                      ' · sent with the default template because the custom one failed'}
                  </p>
                  {message.lastError && (
                    <p className="k-muted">
                      Last delivery error: <code>{message.lastError}</code>
                    </p>
                  )}
                  <pre className="message-preview">{message.body}</pre>
                </details>
                {message.status === 'FAILED' && (
                  <Button
                    busy={retryState.loading}
                    icon={<RotateCcw size={16} aria-hidden="true" />}
                    aria-label={`Retry sending “${message.subject}” to ${message.recipient}`}
                    onClick={() =>
                      void run(async () => {
                        const result = await retryMessage({
                          variables: { messageId: message.id },
                        });
                        return result.data?.retryMessage.errors;
                      }, 'Queued for delivery again.')
                    }
                  >
                    Retry
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {outbox?.pageInfo.hasNextPage && (
        <Button
          busy={loading}
          onClick={() => void fetchMore({ variables: { after: outbox.pageInfo.endCursor } })}
        >
          Load more
        </Button>
      )}
    </div>
  );
}

/**
 * The manager's Outbox page, newest first, with Load more.
 *
 * @remarks
 * Times are shown in the workspace's zone. A failed message shows its last
 * error and can be queued again with Retry.
 * @see docs/adr/0005-transactional-outbox-for-messages.md
 */
export function OutboxPage() {
  return (
    <ManagerOnly title="Outbox">
      <OutboxContent />
    </ManagerOnly>
  );
}
