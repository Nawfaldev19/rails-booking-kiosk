// Manager page: edit the Liquid templates for booking messages, with a live preview.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  messagePreviewQuery,
  messageTemplatesQuery,
  resetMessageTemplateMutation,
  saveMessageTemplateMutation,
  type MessageKind,
} from '@booking-kiosk/api';
import { Button, ErrorNotice, LoadingBlock, Notice } from '@booking-kiosk/ui';
import { useEffect, useId, useState } from 'react';
import { ManagerOnly } from '../routes/WorkspaceLayout';
import { useWorkspace } from '../routes/workspace';
import { useAction } from './useAction';

const KIND_LABEL: Readonly<Record<MessageKind, string>> = {
  BOOKING_CONFIRMED: 'Booking confirmed',
  BOOKING_CANCELLED: 'Booking cancelled',
};

const VARIABLES = [
  'member.name',
  'machine.name',
  'workspace.name',
  'booking.date',
  'booking.starts_at',
  'booking.ends_at',
];

/** Waits until typing pauses before asking the server for a preview. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettled(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);
  return settled;
}

/** One template's subject and body editor with a debounced server-side preview. */
function TemplateEditor({
  kind,
  subject: savedSubject,
  body: savedBody,
  customised,
}: {
  kind: MessageKind;
  subject: string;
  body: string;
  customised: boolean;
}) {
  const workspace = useWorkspace();
  const subjectId = useId();
  const bodyId = useId();
  const problemsId = useId();
  const [subject, setSubject] = useState(savedSubject);
  const [body, setBody] = useState(savedBody);
  const draft = useDebounced({ subject, body }, 400);
  const preview = useQuery(messagePreviewQuery, {
    variables: { slug: workspace.slug, kind, ...draft },
  });
  const [save, saveState] = useMutation(saveMessageTemplateMutation, {
    refetchQueries: ['MessageTemplates'],
  });
  const [reset, resetState] = useMutation(resetMessageTemplateMutation, {
    refetchQueries: ['MessageTemplates'],
  });
  const { message, run } = useAction();
  // Keep showing the last preview while the next one loads, instead of flashing a skeleton.
  const rendered = (preview.data ?? preview.previousData)?.workspace?.messagePreview;
  const problems = rendered?.problems ?? [];
  // The problems may come from either field, so both point at the one list of them.
  const invalid = problems.length > 0;
  const invalidProps = invalid ? { 'aria-invalid': true, 'aria-describedby': problemsId } : {};
  const problemSummary = !rendered
    ? ''
    : problems.length === 0
      ? 'The template renders without problems.'
      : `${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} found. Fix them to save the template.`;

  return (
    <div className="k-card k-stack" role="region" aria-labelledby={`${subjectId}-heading`}>
      <h2 id={`${subjectId}-heading`}>
        {KIND_LABEL[kind]}{' '}
        {customised ? (
          <span className="k-muted">(customised)</span>
        ) : (
          <span className="k-muted">(default)</span>
        )}
      </h2>
      <div className="template-columns">
        <div className="k-stack">
          <div className="k-field">
            <label htmlFor={subjectId}>Subject</label>
            <input
              id={subjectId}
              className="k-input"
              value={subject}
              maxLength={160}
              {...invalidProps}
              onChange={(e) => {
                setSubject(e.target.value);
              }}
            />
          </div>
          <div className="k-field">
            <label htmlFor={bodyId}>Body</label>
            <textarea
              id={bodyId}
              className="k-textarea"
              value={body}
              maxLength={5000}
              {...invalidProps}
              onChange={(e) => {
                setBody(e.target.value);
              }}
            />
          </div>
          <p className="k-muted template-vars">
            Available:{' '}
            {VARIABLES.map((v) => (
              <code key={v}>{`{{ ${v} }}`} </code>
            ))}
          </p>
        </div>
        <div className="k-stack">
          <h3>Preview with sample values</h3>
          {/* Only the outcome is announced, not the whole message after every pause in typing. */}
          <p role="status" className="visually-hidden">
            {problemSummary}
          </p>
          {invalid ? (
            <Notice tone="error" id={problemsId}>
              This template would fall back to the default: {problems.join('; ')}
            </Notice>
          ) : rendered ? (
            <div className="message-preview">
              <p>
                <strong>{rendered.subject}</strong>
              </p>
              <pre>{rendered.body}</pre>
            </div>
          ) : (
            <LoadingBlock label="Rendering preview" lines={3} />
          )}
        </div>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="k-cluster">
        <Button
          variant="primary"
          busy={saveState.loading}
          disabled={invalid}
          onClick={() =>
            void run(async () => {
              const result = await save({ variables: { kind, subject, body } });
              return result.data?.saveMessageTemplate.errors;
            }, 'Template saved. New messages will use it.')
          }
        >
          Save template
        </Button>
        {customised && (
          <Button
            variant="ghost"
            busy={resetState.loading}
            onClick={() =>
              void run(async () => {
                const result = await reset({ variables: { kind } });
                const template = result.data?.resetMessageTemplate.template;
                if (template) {
                  setSubject(template.subject);
                  setBody(template.body);
                }
                return result.data?.resetMessageTemplate.errors;
              }, 'Back to the default wording.')
            }
          >
            Reset to default
          </Button>
        )}
      </div>
    </div>
  );
}

function MessagesContent() {
  const workspace = useWorkspace();
  const { data, loading, error, refetch } = useQuery(messageTemplatesQuery, {
    variables: { slug: workspace.slug },
  });
  return (
    <div className="k-stack">
      <h1 className="k-page-title">Messages</h1>
      <p className="k-muted">
        Members get these by email. Templates use Liquid: only the listed values are available, so a
        template can never reach other data.
      </p>
      {loading && !data ? (
        <LoadingBlock label="Loading templates" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : (
        data?.workspace?.messageTemplates.map((template) => (
          <TemplateEditor
            key={`${template.kind}-${template.customised ? 'c' : 'd'}`}
            {...template}
          />
        ))
      )}
    </div>
  );
}

/**
 * The manager's Messages page: one editor per message kind.
 *
 * @remarks
 * The preview is rendered by the API against sample values, so it shows exactly
 * what saving would accept; unknown variables are listed as problems.
 * @see docs/adr/0006-liquid-for-workspace-editable-templates.md
 */
export function MessagesPage() {
  return (
    <ManagerOnly title="Messages">
      <MessagesContent />
    </ManagerOnly>
  );
}
