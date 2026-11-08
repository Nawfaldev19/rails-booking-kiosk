// Manager page: the workspace's staff and managers, role changes, removal, and inviting someone.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  addTeamMemberMutation,
  changeTeamRoleMutation,
  describeFailure,
  removeTeamMemberMutation,
  teamQuery,
  type Role,
  type StaffMemberFieldsFragment,
  type UserErrorLike,
} from '@booking-kiosk/api';
import {
  Button,
  ErrorNotice,
  LoadingBlock,
  Notice,
  StatusPill,
  TextField,
} from '@booking-kiosk/ui';
import { UserPlus } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ManagerOnly } from '../routes/WorkspaceLayout';
import { useWorkspace } from '../routes/workspace';
import { useAction, type ActionMessage } from './useAction';

const ROLE_LABEL: Readonly<Record<Role, string>> = {
  MANAGER: 'Manager',
  STAFF: 'Staff',
  MEMBER: 'Member',
};

const EMPTY_DRAFT = { name: '', email: '', password: '', role: 'STAFF' as Role };

/** One person on the team, with a role picker and a two-step Remove for everyone but the viewer. */
function TeamEntry({
  person,
  onOutcome,
}: {
  person: StaffMemberFieldsFragment;
  onOutcome: (outcome: ActionMessage, removed: boolean) => void;
}) {
  const roleId = useId();
  const [role, setRole] = useState<Role>(person.role);
  const [confirming, setConfirming] = useState(false);
  const [changeRole, changeState] = useMutation(changeTeamRoleMutation, {
    refetchQueries: ['Team'],
  });
  const [remove, removeState] = useMutation(removeTeamMemberMutation, { refetchQueries: ['Team'] });

  const report = async (
    perform: () => Promise<readonly UserErrorLike[] | undefined>,
    success: string,
    removing = false,
  ) => {
    try {
      const failure = (await perform())?.[0];
      onOutcome(
        failure ? { tone: 'error', text: failure.message } : { tone: 'success', text: success },
        removing && !failure,
      );
    } catch (failure) {
      onOutcome({ tone: 'error', text: describeFailure(failure) }, false);
    }
  };

  return (
    <li className="k-card booking-item team-entry">
      <div>
        <strong>{person.name}</strong>
        <p className="k-muted">{person.email}</p>
      </div>
      <div className="k-cluster">
        <StatusPill tone={person.role === 'MANAGER' ? 'info' : 'muted'}>
          {ROLE_LABEL[person.role]}
        </StatusPill>
        {person.invitationPending && <StatusPill tone="warning">Invitation sent</StatusPill>}
        {person.isViewer && <StatusPill tone="muted">You</StatusPill>}
      </div>
      {!person.isViewer && (
        <div className="k-cluster">
          <label htmlFor={roleId} className="visually-hidden">
            Role for {person.name}
          </label>
          <select
            id={roleId}
            className="k-select team-role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
            }}
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member (no team access)</option>
          </select>
          <Button
            busy={changeState.loading}
            disabled={role === person.role}
            aria-label={`Change role for ${person.name}`}
            onClick={() =>
              void report(async () => {
                const result = await changeRole({ variables: { membershipId: person.id, role } });
                return result.data?.changeTeamRole.errors;
              }, `${person.name} is now ${ROLE_LABEL[role].toLowerCase()}.`)
            }
          >
            Change role
          </Button>
          {confirming ? (
            <>
              <Button
                variant="danger"
                busy={removeState.loading}
                aria-label={`Yes, remove ${person.name}`}
                onClick={() =>
                  void report(
                    async () => {
                      const result = await remove({ variables: { membershipId: person.id } });
                      return result.data?.removeTeamMember.errors;
                    },
                    `${person.name} was removed from the workspace.`,
                    true,
                  ).then(() => {
                    setConfirming(false);
                  })
                }
              >
                Yes, remove
              </Button>
              <Button
                variant="ghost"
                aria-label={`Keep ${person.name}`}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Keep
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              aria-label={`Remove ${person.name}…`}
              onClick={() => {
                setConfirming(true);
              }}
            >
              Remove…
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function TeamContent() {
  const workspace = useWorkspace();
  const { data, loading, error, refetch } = useQuery(teamQuery, {
    variables: { slug: workspace.slug },
  });
  const [add, addState] = useMutation(addTeamMemberMutation, { refetchQueries: ['Team'] });
  const { message, fieldErrors, run } = useAction();
  const [outcome, setOutcome] = useState<ActionMessage | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // A removed person's entry disappears with its buttons, so focus moves to the heading.
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = outcome ?? message;

  return (
    <div className="k-stack">
      <h1 className="k-page-title" ref={heading} tabIndex={-1}>
        Team
      </h1>
      <p className="k-muted">
        Staff can use the front-desk kiosk. Managers can do everything. Nobody can change their own
        role, so every workspace keeps at least one manager.
      </p>
      {shown && <Notice tone={shown.tone}>{shown.text}</Notice>}
      {loading && !data ? (
        <LoadingBlock label="Loading team" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : (
        <ul className="booking-list">
          {data?.workspace?.team.map((person) => (
            <TeamEntry
              key={`${person.id}:${person.role}`}
              person={person}
              onOutcome={(next, removed) => {
                setOutcome(next);
                if (removed) heading.current?.focus();
              }}
            />
          ))}
        </ul>
      )}
      <form
        className="k-card k-stack"
        aria-labelledby="add-person"
        onSubmit={(e) => {
          e.preventDefault();
          setOutcome(null);
          let invited = false;
          void run(
            async () => {
              const result = await add({
                variables: { ...draft, password: draft.password === '' ? null : draft.password },
              });
              invited = result.data?.addTeamMember.teamMember?.invitationPending ?? false;
              return result.data?.addTeamMember.errors;
            },
            () =>
              invited
                ? `Invitation sent to ${draft.email.trim()}. They choose their own password from the link in it.`
                : `${draft.name} added to the team.`,
          ).then((ok) => {
            if (ok) setDraft(EMPTY_DRAFT);
          });
        }}
      >
        <h2 id="add-person" className="k-cluster">
          <UserPlus size={20} aria-hidden="true" /> Add a team member
        </h2>
        <TextField
          label="Name"
          required
          value={draft.name}
          error={fieldErrors.name ?? null}
          onChange={(e) => {
            setDraft({ ...draft, name: e.target.value });
          }}
        />
        <TextField
          label="Email"
          type="email"
          required
          value={draft.email}
          error={fieldErrors.email ?? null}
          onChange={(e) => {
            setDraft({ ...draft, email: e.target.value });
          }}
        />
        <TextField
          label="Their own password (only for an existing Booking Kiosk account)"
          type="password"
          autoComplete="off"
          hint="Leave empty for someone new: they get an invitation with a link to choose their own password. If this email already has a Booking Kiosk account, its owner types their password here to agree to join."
          value={draft.password}
          error={fieldErrors.password ?? null}
          onChange={(e) => {
            setDraft({ ...draft, password: e.target.value });
          }}
        />
        <label className="k-field">
          Role
          <select
            className="k-select"
            value={draft.role}
            onChange={(e) => {
              setDraft({ ...draft, role: e.target.value as Role });
            }}
          >
            <option value="STAFF">Staff (kiosk only)</option>
            <option value="MANAGER">Manager</option>
          </select>
        </label>
        <Button type="submit" variant="primary" busy={addState.loading}>
          Add to team
        </Button>
      </form>
    </div>
  );
}

/**
 * The manager's Team page.
 *
 * @remarks
 * New people are invited and choose their own password; the manager never
 * sets or sees one. Each entry's buttons name the person they act on.
 * @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
 */
export function TeamPage() {
  return (
    <ManagerOnly title="Team">
      <TeamContent />
    </ManagerOnly>
  );
}
