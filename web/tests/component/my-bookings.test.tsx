import { cancelBookingMutation, myBookingsQuery } from '@booking-kiosk/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyBookingsPage } from '../../apps/member/src/booking/MyBookingsPage';
import { booking, workspace } from './data';
import { always, renderPage } from './render';

const started = booking('b1', { startsAt: '2026-03-11T13:00:00Z', endsAt: '2026-03-11T14:00:00Z' });
const later = booking('b2', { startsAt: '2026-03-12T10:00:00Z', endsAt: '2026-03-12T11:00:00Z' });
// Every booking's buttons name the booking, so a list of several never repeats a name.
const CANCEL_LATER = 'Cancel Laser cutter, Thursday 12 March, 10:00–11:00…';

function upcoming(nodes: ReturnType<typeof booking>[]) {
  return {
    request: { query: myBookingsQuery, variables: { slug: 'larkspur', upcoming: true } },
    result: {
      data: {
        workspace: {
          __typename: 'Workspace' as const,
          id: 'w1',
          myBookings: {
            __typename: 'BookingConnection' as const,
            nodes,
            pageInfo: { __typename: 'PageInfo' as const, hasNextPage: false, endCursor: null },
          },
        },
      },
    },
  };
}

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-03-11T13:20:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('only offers to cancel bookings that have not started', async () => {
    const screen = await renderPage(<MyBookingsPage />, {
      mocks: [always(upcoming([started, later]))],
      outletContext: { workspace },
    });
    const items = screen.getByRole('listitem');
    await expect.element(items.nth(1).getByRole('button', { name: CANCEL_LATER })).toBeVisible();
    expect(
      items
        .nth(0)
        .getByRole('button', { name: /^Cancel/ })
        .query(),
    ).toBeNull();
  });

  it('keeps keyboard focus through the two-step cancel', async () => {
    const screen = await renderPage(<MyBookingsPage />, {
      mocks: [
        upcoming([later]),
        {
          request: { query: cancelBookingMutation, variables: { bookingId: 'b2' } },
          result: {
            data: {
              cancelBooking: {
                __typename: 'CancelBookingPayload',
                booking: { ...later, status: 'CANCELLED' },
                errors: [],
              },
            },
          },
        },
      ],
      outletContext: { workspace },
    });
    await screen.getByRole('button', { name: CANCEL_LATER }).click();
    await expect
      .element(
        screen.getByRole('button', { name: /^Yes, cancel it: Laser cutter, Thursday 12 March/ }),
      )
      .toHaveFocus();
    await screen
      .getByRole('button', { name: /^Keep booking: Laser cutter, Thursday 12 March/ })
      .click();
    await expect.element(screen.getByRole('button', { name: CANCEL_LATER })).toHaveFocus();

    await screen.getByRole('button', { name: CANCEL_LATER }).click();
    await screen
      .getByRole('button', { name: /^Yes, cancel it: Laser cutter, Thursday 12 March/ })
      .click();
    await expect.element(screen.getByText('Booking cancelled.')).toBeVisible();
    await expect.element(screen.getByRole('listitem')).toHaveFocus();
    await expect.element(screen.getByRole('listitem').getByText('Cancelled')).toBeVisible();
  });

  it('offers a retry when the list cannot load', async () => {
    const screen = await renderPage(<MyBookingsPage />, {
      mocks: [
        {
          request: { query: myBookingsQuery, variables: { slug: 'larkspur', upcoming: true } },
          error: new TypeError('Failed to fetch'),
        },
        upcoming([later]),
      ],
      outletContext: { workspace },
    });
    await expect.element(screen.getByText(/Cannot reach the server/)).toBeVisible();
    await screen.getByRole('button', { name: 'Try again' }).click();
    await expect.element(screen.getByRole('button', { name: CANCEL_LATER })).toBeVisible();
  });
});
