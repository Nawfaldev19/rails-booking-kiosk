import {
  addTeamMemberMutation,
  changeTeamRoleMutation,
  machinesQuery,
  outboxQuery,
  removeTeamMemberMutation,
  retireMachineMutation,
  retryMessageMutation,
  teamQuery,
} from '@booking-kiosk/api';
import { describe, expect, it } from 'vitest';
import { MachinesPage } from '../../apps/member/src/manage/MachinesPage';
import { OutboxPage } from '../../apps/member/src/manage/OutboxPage';
import { TeamPage } from '../../apps/member/src/manage/TeamPage';
import { managerWorkspace, workspace } from './data';
import { renderPage } from './render';

const lathe = {
  __typename: 'Machine' as const,
  id: 'm2',
  name: 'Wood lathe',
  description: 'Variable speed.',
  slotMinutes: 60,
  retired: false,
};

const machines = {
  request: { query: machinesQuery, variables: { slug: 'larkspur' } },
  result: {
    data: { workspace: { __typename: 'Workspace' as const, id: 'w1', machines: [lathe] } },
  },
};

describe('MachinesPage', () => {
  it('asks before retiring a machine and keeps focus on its list item', async () => {
    const screen = await renderPage(<MachinesPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        machines,
        {
          request: { query: retireMachineMutation, variables: { machineId: 'm2' } },
          result: {
            data: {
              retireMachine: {
                __typename: 'RetireMachinePayload',
                machine: { __typename: 'Machine', id: 'm2', retired: true },
                errors: [],
              },
            },
          },
        },
      ],
    });
    await screen.getByRole('button', { name: 'Retire…' }).click();
    const confirm = screen.getByRole('button', { name: 'Yes, retire it' });
    await expect.element(confirm).toHaveFocus();
    await screen.getByRole('button', { name: 'Keep in service' }).click();
    await expect.element(screen.getByRole('button', { name: 'Retire…' })).toHaveFocus();

    await screen.getByRole('button', { name: 'Retire…' }).click();
    await screen.getByRole('button', { name: 'Yes, retire it' }).click();
    await expect
      .element(screen.getByText('Wood lathe retired. Its history is kept.'))
      .toBeVisible();
    await expect.element(screen.getByText('Retired', { exact: true })).toBeVisible();
    await expect.element(screen.getByRole('listitem')).toHaveFocus();
  });

  it('tells members the page is for managers', async () => {
    const screen = await renderPage(<MachinesPage />, { outletContext: { workspace }, mocks: [] });
    await expect.element(screen.getByRole('heading', { name: 'Managers only' })).toBeVisible();
  });
});

describe('TeamPage', () => {
  const person = (id: string, name: string, extra: Partial<Record<string, unknown>> = {}) => ({
    __typename: 'StaffMember' as const,
    id,
    name,
    email: `${name.split(' ')[0]?.toLowerCase() ?? id}@example.com`,
    role: 'STAFF' as 'STAFF' | 'MANAGER' | 'MEMBER',
    invitationPending: false,
    isViewer: false,
    ...extra,
  });
  const robin = person('t1', 'Robin Ashdown', { role: 'MANAGER', isViewer: true });
  const jules = person('t2', 'Jules Fenwick');
  const team = (members: ReturnType<typeof person>[]) => ({
    request: { query: teamQuery, variables: { slug: 'larkspur' } },
    result: { data: { workspace: { __typename: 'Workspace' as const, id: 'w1', team: members } } },
  });
  const addResult = (teamMember: unknown, errors: unknown[] = []) => ({
    data: { addTeamMember: { __typename: 'AddTeamMemberPayload', teamMember, errors } },
  });

  it("shows an existing account's refusal on the password field", async () => {
    const draft = {
      name: 'Pat',
      email: 'pat@example.com',
      password: 'guess-guess-1',
      role: 'STAFF',
    };
    const screen = await renderPage(<TeamPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        team([]),
        {
          request: { query: addTeamMemberMutation, variables: draft },
          result: addResult(null, [
            {
              __typename: 'UserError',
              code: 'INVALID_CREDENTIALS',
              field: 'password',
              message: 'That email already has a Booking Kiosk account.',
            },
          ]),
        },
      ],
    });
    const password = screen.getByLabelText(/Their own password/);
    await expect.element(password).toHaveAccessibleDescription(/link to choose their own password/);
    await screen.getByLabelText('Name').fill(draft.name);
    await screen.getByLabelText('Email').fill(draft.email);
    await password.fill(draft.password);
    await screen.getByRole('button', { name: 'Add to team' }).click();
    await expect
      .element(password)
      .toHaveAccessibleDescription(/That email already has a Booking Kiosk account/);
  });

  it('invites someone new without a password and says an invitation was sent', async () => {
    const quinn = person('t3', 'Quinn Example', { invitationPending: true });
    const screen = await renderPage(<TeamPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        team([robin]),
        {
          request: {
            query: addTeamMemberMutation,
            variables: {
              name: 'Quinn Example',
              email: 'quinn@example.com',
              password: null,
              role: 'STAFF',
            },
          },
          result: addResult(quinn),
        },
        team([robin, quinn]),
      ],
    });
    await screen.getByLabelText('Name').fill('Quinn Example');
    await screen.getByLabelText('Email').fill('quinn@example.com');
    await screen.getByRole('button', { name: 'Add to team' }).click();
    await expect.element(screen.getByText(/Invitation sent to quinn@example.com/)).toBeVisible();
    await expect.element(screen.getByText('Invitation sent', { exact: true })).toBeVisible();
  });

  it('offers no changes on your own entry, and names each button after the person', async () => {
    const screen = await renderPage(<TeamPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [team([robin, jules])],
    });
    await expect
      .element(screen.getByRole('button', { name: 'Remove Jules Fenwick…' }))
      .toBeVisible();
    await expect
      .element(screen.getByRole('combobox', { name: 'Role for Jules Fenwick' }))
      .toHaveValue('STAFF');
    expect(screen.getByRole('button', { name: /Robin Ashdown/ }).query()).toBeNull();
    await expect.element(screen.getByText('You', { exact: true })).toBeVisible();
  });

  it('changes a role, and removes someone after asking, keeping focus on the page', async () => {
    const screen = await renderPage(<TeamPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        team([robin, jules]),
        {
          request: {
            query: changeTeamRoleMutation,
            variables: { membershipId: 't2', role: 'MANAGER' },
          },
          result: {
            data: {
              changeTeamRole: {
                __typename: 'ChangeTeamRolePayload',
                teamMember: { ...jules, role: 'MANAGER' },
                errors: [],
              },
            },
          },
        },
        team([robin, { ...jules, role: 'MANAGER' }]),
        {
          request: { query: removeTeamMemberMutation, variables: { membershipId: 't2' } },
          result: {
            data: {
              removeTeamMember: {
                __typename: 'RemoveTeamMemberPayload',
                removedId: 't2',
                errors: [],
              },
            },
          },
        },
        team([robin]),
      ],
    });
    const changeButton = screen.getByRole('button', { name: 'Change role for Jules Fenwick' });
    await expect.element(changeButton).toBeDisabled();
    await screen.getByRole('combobox', { name: 'Role for Jules Fenwick' }).selectOptions('MANAGER');
    await changeButton.click();
    await expect.element(screen.getByText('Jules Fenwick is now manager.')).toBeVisible();

    await screen.getByRole('button', { name: 'Remove Jules Fenwick…' }).click();
    await screen.getByRole('button', { name: 'Yes, remove Jules Fenwick' }).click();
    await expect
      .element(screen.getByText('Jules Fenwick was removed from the workspace.'))
      .toBeVisible();
    await expect.element(screen.getByRole('heading', { name: 'Team', level: 1 })).toHaveFocus();
    await expect
      .element(screen.getByText('Jules Fenwick', { exact: true }))
      .not.toBeInTheDocument();
  });
});

describe('OutboxPage', () => {
  it('shows times in the workspace zone, the last error, and retries a failed message', async () => {
    const failed = {
      __typename: 'OutboundMessage' as const,
      id: 'o1',
      kind: 'BOOKING_CONFIRMED',
      recipient: 'sam@example.com',
      subject: 'Booked: Laser cutter',
      body: 'See you.',
      status: 'FAILED',
      attempts: 5,
      lastError: 'Net::SMTPServerBusy: busy',
      usedFallbackTemplate: false,
      createdAt: '2026-07-01T11:30:00Z',
    };
    const screen = await renderPage(<OutboxPage />, {
      outletContext: { workspace: managerWorkspace },
      mocks: [
        {
          request: { query: outboxQuery, variables: { slug: 'larkspur' } },
          result: {
            data: {
              workspace: {
                __typename: 'Workspace' as const,
                id: 'w1',
                outbox: {
                  __typename: 'OutboundMessageConnection' as const,
                  nodes: [failed],
                  pageInfo: {
                    __typename: 'PageInfo' as const,
                    hasNextPage: false,
                    endCursor: null,
                  },
                },
              },
            },
          },
        },
        {
          request: { query: retryMessageMutation, variables: { messageId: 'o1' } },
          result: {
            data: {
              retryMessage: {
                __typename: 'RetryMessagePayload',
                message: {
                  __typename: 'OutboundMessage',
                  id: 'o1',
                  status: 'PENDING',
                  attempts: 0,
                  lastError: 'Net::SMTPServerBusy: busy',
                },
                errors: [],
              },
            },
          },
        },
      ],
    });
    await screen.getByText('Booked: Laser cutter').click();
    // 11:30 UTC is 12:30 in London in July (summer time).
    await expect.element(screen.getByText(/1 Jul 2026, 12:30/)).toBeVisible();
    await expect.element(screen.getByText('Net::SMTPServerBusy: busy')).toBeVisible();
    await screen.getByRole('button', { name: /^Retry sending/ }).click();
    await expect.element(screen.getByText('Queued for delivery again.')).toBeVisible();
    await expect.element(screen.getByText('Pending', { exact: true })).toBeVisible();
  });
});
