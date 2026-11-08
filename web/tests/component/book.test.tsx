import { availabilityQuery, myHoldsQuery, placeHoldMutation } from '@booking-kiosk/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookPage } from '../../apps/member/src/booking/BookPage';
import { booking, workspace } from './data';
import { always, renderPage } from './render';

const machine = {
  __typename: 'Machine' as const,
  id: 'm1',
  name: 'Laser cutter',
  description: '60 W',
  slotMinutes: 60,
};

function availability(states: readonly string[], date = '2026-03-11') {
  return always({
    request: { query: availabilityQuery, variables: { slug: 'larkspur', date } },
    result: {
      data: {
        workspace: {
          __typename: 'Workspace' as const,
          id: 'w1',
          availability: [
            {
              __typename: 'MachineDay' as const,
              machine,
              slots: states.map((state, i) => ({
                __typename: 'Slot' as const,
                startsAt: `${date}T${String(9 + i).padStart(2, '0')}:00:00+00:00`,
                endsAt: `${date}T${String(10 + i).padStart(2, '0')}:00:00+00:00`,
                state,
                bookingId: null,
              })),
            },
          ],
        },
      },
    },
  });
}

function myHolds(list: ReturnType<typeof booking>[] = []) {
  return {
    request: { query: myHoldsQuery, variables: { slug: 'larkspur' } },
    // Like the real server, each answer carries the time it was sent (here the device's own).
    result: () => ({
      data: {
        serverTime: new Date().toISOString(),
        workspace: { __typename: 'Workspace' as const, id: 'w1', myHolds: list },
      },
    }),
  };
}

describe('BookPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-03-11T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels each slot with its time and state, and only free slots are enabled', async () => {
    const screen = await renderPage(<BookPage />, {
      mocks: [availability(['PAST', 'FREE', 'TAKEN']), always(myHolds())],
      outletContext: { workspace },
    });
    await expect
      .element(screen.getByRole('button', { name: 'Laser cutter, 09:00, already started' }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole('button', { name: 'Laser cutter, 10:00, free' }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole('button', { name: 'Laser cutter, 11:00, taken' }))
      .toBeDisabled();
    await expect.element(screen.getByText(/you can hold up to 3 at once/)).toBeVisible();
    expect(
      screen.getByRole('group', { name: 'Choose a day' }).getByRole('button').all(),
    ).toHaveLength(14);
  });

  it('explains when someone else wins the race for a slot', async () => {
    const screen = await renderPage(<BookPage />, {
      outletContext: { workspace },
      mocks: [
        availability(['FREE']),
        always(myHolds()),
        {
          request: {
            query: placeHoldMutation,
            variables: { machineId: 'm1', startsAt: '2026-03-11T09:00:00+00:00' },
          },
          result: {
            data: {
              placeHold: {
                __typename: 'PlaceHoldPayload',
                booking: null,
                errors: [
                  {
                    __typename: 'UserError',
                    code: 'SLOT_TAKEN',
                    message: 'That slot is no longer free.',
                  },
                ],
              },
            },
          },
        },
      ],
    });
    await screen.getByRole('button', { name: 'Laser cutter, 09:00, free' }).click();
    const message = screen.getByText(/Someone else got that slot first/);
    await expect.element(message).toBeVisible();
    expect(message.element().closest('[role="alert"]')).not.toBeNull();
  });

  it('announces a new hold and moves focus to its Confirm button', async () => {
    const held = booking('h1', {
      status: 'HELD',
      startsAt: '2026-03-11T09:00:00Z',
      endsAt: '2026-03-11T10:00:00Z',
      holdExpiresAt: '2026-03-11T08:05:00Z',
    });
    const screen = await renderPage(<BookPage />, {
      outletContext: { workspace },
      mocks: [
        availability(['FREE']),
        myHolds(),
        {
          request: {
            query: placeHoldMutation,
            variables: { machineId: 'm1', startsAt: '2026-03-11T09:00:00+00:00' },
          },
          result: {
            data: { placeHold: { __typename: 'PlaceHoldPayload', booking: held, errors: [] } },
          },
        },
        always(myHolds([held])),
      ],
    });
    await screen.getByRole('button', { name: 'Laser cutter, 09:00, free' }).click();
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'is held for' }))
      .toHaveTextContent(
        'Laser cutter at 09:00 is held for 5 minutes. Confirm it under Your holds.',
      );
    await expect
      .element(screen.getByRole('button', { name: 'Confirm Laser cutter, 09:00' }))
      .toHaveFocus();
  });

  it('moves on to the new day at midnight instead of asking for yesterday', async () => {
    const screen = await renderPage(<BookPage />, {
      mocks: [availability(['FREE']), availability(['FREE'], '2026-03-12'), always(myHolds())],
      outletContext: { workspace },
    });
    const strip = screen.getByRole('group', { name: 'Choose a day' });
    await expect
      .element(strip.getByRole('button', { name: 'Today' }))
      .toHaveAttribute('aria-pressed', 'true');
    vi.setSystemTime(new Date('2026-03-12T00:00:30Z'));
    vi.advanceTimersByTime(60_000);
    await expect
      .element(screen.getByRole('heading', { name: 'Thursday 12 March' }))
      .toBeInTheDocument();
    await expect.element(strip.getByRole('button', { name: 'Thu 12 Mar' })).not.toBeInTheDocument();
  });

  it('shows a retry for a failed grid instead of the empty state', async () => {
    const screen = await renderPage(<BookPage />, {
      mocks: [
        {
          request: {
            query: availabilityQuery,
            variables: { slug: 'larkspur', date: '2026-03-11' },
          },
          error: new TypeError('Failed to fetch'),
        },
        availability(['FREE']),
        always(myHolds()),
      ],
      outletContext: { workspace },
    });
    await expect.element(screen.getByText(/Cannot reach the server/)).toBeVisible();
    await expect
      .element(screen.getByRole('heading', { name: 'No machines to book' }))
      .not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Try again' }).click();
    await expect
      .element(screen.getByRole('button', { name: 'Laser cutter, 09:00, free' }))
      .toBeEnabled();
  });

  it('shows an empty state when no machines are in service', async () => {
    const empty = always({
      request: { query: availabilityQuery, variables: { slug: 'larkspur', date: '2026-03-11' } },
      result: {
        data: { workspace: { __typename: 'Workspace' as const, id: 'w1', availability: [] } },
      },
    });
    const screen = await renderPage(<BookPage />, {
      mocks: [empty, always(myHolds())],
      outletContext: { workspace },
    });
    await expect
      .element(screen.getByRole('heading', { name: 'No machines to book' }))
      .toBeVisible();
  });
});
