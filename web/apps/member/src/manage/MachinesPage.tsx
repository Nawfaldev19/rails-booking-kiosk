// Manager page: add, edit and retire machines.
import { useMutation, useQuery } from '@apollo/client/react';
import {
  createMachineMutation,
  machinesQuery,
  retireMachineMutation,
  updateMachineMutation,
} from '@booking-kiosk/api';
import {
  Button,
  EmptyState,
  ErrorNotice,
  LoadingBlock,
  Notice,
  StatusPill,
  TextField,
} from '@booking-kiosk/ui';
import { Archive, CircleCheck, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { ManagerOnly } from '../routes/WorkspaceLayout';
import { useWorkspace } from '../routes/workspace';
import { useAction } from './useAction';

/** The editable fields of a machine. */
interface MachineDraft {
  /** Unique among in-service machines in the workspace. */
  name: string;
  /** Optional; shown under the name in the grid. */
  description: string;
  /** 30 or 60. */
  slotMinutes: number;
}

const EMPTY: MachineDraft = { name: '', description: '', slotMinutes: 60 };

/** The add and edit form; field errors from the API appear under their inputs. */
function MachineForm({
  initial,
  submitLabel,
  fieldErrors,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: MachineDraft;
  submitLabel: string;
  fieldErrors: Readonly<Record<string, string>>;
  busy: boolean;
  onSubmit: (draft: MachineDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className="k-stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
    >
      <TextField
        label="Name"
        required
        maxLength={80}
        value={draft.name}
        error={fieldErrors.name ?? null}
        onChange={(e) => {
          setDraft({ ...draft, name: e.target.value });
        }}
      />
      <TextField
        label="Description"
        maxLength={500}
        value={draft.description}
        error={fieldErrors.description ?? null}
        onChange={(e) => {
          setDraft({ ...draft, description: e.target.value });
        }}
      />
      <label className="k-field">
        Slot length
        <select
          className="k-select"
          value={draft.slotMinutes}
          onChange={(e) => {
            setDraft({ ...draft, slotMinutes: Number(e.target.value) });
          }}
        >
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
        {fieldErrors.slotMinutes && (
          <span className="k-field-error">{fieldErrors.slotMinutes}</span>
        )}
      </label>
      <div className="k-cluster">
        <Button type="submit" variant="primary" busy={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function MachinesContent() {
  const workspace = useWorkspace();
  const { data, loading, error, refetch } = useQuery(machinesQuery, {
    variables: { slug: workspace.slug },
  });
  const [create, createState] = useMutation(createMachineMutation, {
    refetchQueries: ['Machines'],
  });
  const [update, updateState] = useMutation(updateMachineMutation);
  const [retire, retireState] = useMutation(retireMachineMutation);
  const [editing, setEditing] = useState<string | null>(null);
  // Retiring asks for a second click, like cancelling a booking.
  const [retiring, setRetiring] = useState<string | null>(null);
  const focusedRetire = useRef<string | null>(null);
  const returnFocusTo = useRef<string | null>(null);
  const listItems = useRef(new Map<string, HTMLLIElement>());
  const [formKey, setFormKey] = useState(0);
  const { message, fieldErrors, run } = useAction();

  const machines = data?.workspace?.machines ?? [];

  return (
    <div className="k-stack">
      <h1 className="k-page-title">Machines</h1>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {loading && !data ? (
        <LoadingBlock label="Loading machines" />
      ) : error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : machines.length === 0 ? (
        <EmptyState title="No machines yet">
          <p>Add the first one below.</p>
        </EmptyState>
      ) : (
        <ul className="booking-list">
          {machines.map((machine) => (
            <li
              key={machine.id}
              className="k-card"
              tabIndex={-1}
              ref={(node) => {
                if (node) listItems.current.set(machine.id, node);
                else listItems.current.delete(machine.id);
              }}
            >
              {editing === machine.id ? (
                <MachineForm
                  initial={{
                    name: machine.name,
                    description: machine.description,
                    slotMinutes: machine.slotMinutes,
                  }}
                  submitLabel="Save changes"
                  fieldErrors={fieldErrors}
                  busy={updateState.loading}
                  onCancel={() => {
                    setEditing(null);
                  }}
                  onSubmit={(draft) =>
                    void run(async () => {
                      const result = await update({
                        variables: { machineId: machine.id, ...draft },
                      });
                      return result.data?.updateMachine.errors;
                    }, `${draft.name} updated.`).then((ok) => {
                      if (ok) setEditing(null);
                    })
                  }
                />
              ) : (
                <div className="booking-item">
                  <div>
                    <strong>{machine.name}</strong>
                    <p className="k-muted">{machine.description || 'No description'}</p>
                    <p className="k-muted k-mono machine-slots">
                      {machine.slotMinutes}-minute slots
                    </p>
                  </div>
                  {machine.retired ? (
                    <StatusPill tone="muted" icon={<Archive size={14} aria-hidden="true" />}>
                      Retired
                    </StatusPill>
                  ) : (
                    <StatusPill tone="success" icon={<CircleCheck size={14} aria-hidden="true" />}>
                      In service
                    </StatusPill>
                  )}
                  {!machine.retired &&
                    (retiring === machine.id ? (
                      <div
                        className="k-cluster"
                        role="group"
                        aria-label={`Retire ${machine.name}?`}
                      >
                        <Button
                          variant="danger"
                          busy={retireState.loading}
                          ref={(node: HTMLButtonElement | null) => {
                            if (node && focusedRetire.current !== machine.id) {
                              focusedRetire.current = machine.id;
                              node.focus();
                            }
                          }}
                          onClick={() =>
                            void run(async () => {
                              const result = await retire({
                                variables: { machineId: machine.id },
                              });
                              return result.data?.retireMachine.errors;
                            }, `${machine.name} retired. Its history is kept.`).then((ok) => {
                              // On success the list item loses its buttons, so focus the item itself.
                              if (ok) listItems.current.get(machine.id)?.focus();
                              else returnFocusTo.current = machine.id;
                              setRetiring(null);
                            })
                          }
                        >
                          Yes, retire it
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            returnFocusTo.current = machine.id;
                            setRetiring(null);
                          }}
                        >
                          Keep in service
                        </Button>
                      </div>
                    ) : (
                      <div className="k-cluster">
                        <Button
                          onClick={() => {
                            setEditing(machine.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          ref={(node: HTMLButtonElement | null) => {
                            if (node && returnFocusTo.current === machine.id) {
                              returnFocusTo.current = null;
                              node.focus();
                            }
                          }}
                          onClick={() => {
                            focusedRetire.current = null;
                            setRetiring(machine.id);
                          }}
                        >
                          Retire…
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="k-card k-stack" role="region" aria-labelledby="add-machine">
        <h2 id="add-machine" className="k-cluster">
          <Plus size={20} aria-hidden="true" /> Add a machine
        </h2>
        <MachineForm
          key={formKey}
          initial={EMPTY}
          submitLabel="Add machine"
          fieldErrors={editing ? {} : fieldErrors}
          busy={createState.loading}
          onSubmit={(draft) =>
            void run(async () => {
              const result = await create({ variables: draft });
              return result.data?.createMachine.errors;
            }, `${draft.name} added.`).then((ok) => {
              if (ok) setFormKey((k) => k + 1);
            })
          }
        />
      </div>
    </div>
  );
}

/**
 * The manager's Machines page.
 *
 * @remarks
 * Retiring asks first and is refused by the API while the machine has upcoming
 * bookings. Focus returns to the machine's entry, which stays listed as Retired.
 */
export function MachinesPage() {
  return (
    <ManagerOnly title="Machines">
      <MachinesContent />
    </ManagerOnly>
  );
}
