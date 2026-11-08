import { daySheetQuery, markArrivalMutation } from '@booking-kiosk/api';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { DeskPage } from '../../apps/kiosk/src/DeskPage';
import { always, renderPage } from './render';

const booking = (
  id: string,
  name: string,
  machine: string,
  hour: number,
  arrivedAt: string | null = null,
) => ({
  __typename: 'Booking' as const,
  id,
  startsAt: `2026-03-11T${String(hour).padStart(2, '0')}:00:00+00:00`,
  endsAt: `2026-03-11T${String(hour + 1).padStart(2, '0')}:00:00+00:00`,
  arrivedAt,
  machine: { __typename: 'Machine' as const, id: `m-${machine}`, name: machine },
  member: { __typename: 'Member' as const, name },
});

function sheetMock(daySheet: ReturnType<typeof booking>[]) {
  return always({
    request: { query: daySheetQuery, variables: { slug: 'larkspur' } },
    result: {
      data: {
        workspace: {
          __typename: 'Workspace' as const,
          id: 'w1',
          name: 'Larkspur Makerspace',
          today: '2026-03-11',
          timeZone: 'Europe/London',
          daySheet,
        },
      },
    },
  });
}

describe('DeskPage', () => {
  it('lists expected and arrived members with progress', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([
          booking('b1', 'Sam Okafor', 'Laser cutter', 9),
          booking('b2', 'Kit Marlowe', 'Lathe', 10, '2026-03-11T09:55:00Z'),
        ]),
      ],
    });
    await expect
      .element(screen.getByRole('heading', { name: 'Larkspur Makerspace' }))
      .toBeVisible();
    await expect.element(screen.getByText('1 / 2 arrived')).toBeVisible();
    await expect
      .element(screen.getByRole('region', { name: 'Expected (1)' }).getByText('Sam Okafor'))
      .toBeVisible();
    await expect
      .element(screen.getByRole('region', { name: 'Arrived (1)' }).getByText('Kit Marlowe'))
      .toBeVisible();
  });

  it('moves a member to Arrived after marking them', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([booking('b1', 'Sam Okafor', 'Laser cutter', 9)]),
        {
          request: { query: markArrivalMutation, variables: { bookingId: 'b1', arrived: true } },
          result: {
            data: {
              markArrival: {
                __typename: 'MarkArrivalPayload',
                booking: { __typename: 'Booking', id: 'b1', arrivedAt: '2026-03-11T08:58:00Z' },
                errors: [],
              },
            },
          },
        },
      ],
    });
    await screen
      .getByRole('button', { name: 'Mark Sam Okafor as arrived, Laser cutter, 09:00–10:00' })
      .click();
    await expect
      .element(screen.getByRole('button', { name: /^Undo arrival for Sam Okafor/ }))
      .toBeVisible();
    await expect.element(screen.getByText('1 / 1 arrived')).toBeVisible();
  });

  it('announces an arrival and moves focus to the next expected member', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([
          booking('b1', 'Sam Okafor', 'Laser cutter', 9),
          booking('b2', 'Kit Marlowe', 'Lathe', 10),
        ]),
        {
          request: { query: markArrivalMutation, variables: { bookingId: 'b1', arrived: true } },
          result: {
            data: {
              markArrival: {
                __typename: 'MarkArrivalPayload',
                booking: { __typename: 'Booking', id: 'b1', arrivedAt: '2026-03-11T08:58:00Z' },
                errors: [],
              },
            },
          },
        },
      ],
    });
    await screen
      .getByRole('button', { name: 'Mark Sam Okafor as arrived, Laser cutter, 09:00–10:00' })
      .click();
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'marked as arrived' }))
      .toHaveTextContent('Sam Okafor marked as arrived.');
    await expect
      .element(screen.getByRole('button', { name: /^Mark Kit Marlowe as arrived/ }))
      .toHaveFocus();
    await expect
      .element(screen.getByRole('progressbar', { name: 'Members arrived' }))
      .toHaveAttribute('aria-valuetext', '1 of 2 members arrived');
  });

  it('shows "Not available" when the server refuses the day sheet', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        {
          request: { query: daySheetQuery, variables: { slug: 'larkspur' } },
          result: {
            data: { workspace: null },
            errors: [
              new GraphQLError('Your role in this workspace cannot do that.', {
                extensions: { code: 'FORBIDDEN' },
              }),
            ],
          },
        },
      ],
    });
    await expect.element(screen.getByRole('heading', { name: 'Not available' })).toBeVisible();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a typed error from the server without changing the lists', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([booking('b1', 'Sam Okafor', 'Laser cutter', 9)]),
        {
          request: { query: markArrivalMutation, variables: { bookingId: 'b1', arrived: true } },
          result: {
            data: {
              markArrival: {
                __typename: 'MarkArrivalPayload',
                booking: null,
                errors: [
                  {
                    __typename: 'UserError',
                    code: 'INVALID_STATE',
                    message: 'Only confirmed bookings can be marked.',
                  },
                ],
              },
            },
          },
        },
      ],
    });
    await screen
      .getByRole('button', { name: 'Mark Sam Okafor as arrived, Laser cutter, 09:00–10:00' })
      .click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Only confirmed bookings can be marked.');
    await expect.element(screen.getByText('0 / 1 arrived')).toBeVisible();
  });

  it('filters by search and shows an empty day', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([
          booking('b1', 'Inés Valdés', 'Lathe', 9),
          booking('b2', 'Sam Okafor', 'Laser cutter', 10),
        ]),
      ],
    });
    await screen.getByRole('searchbox', { name: 'Search by member or machine' }).fill('ines');
    await expect.element(screen.getByRole('region', { name: 'Expected (1)' })).toBeVisible();
    await expect.element(screen.getByText('Sam Okafor')).not.toBeInTheDocument();
  });

  it('names each button after the booking, so one member booked twice gets two distinct buttons', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [
        sheetMock([
          booking('b1', 'Inés Valdés', 'Lathe', 9),
          booking('b2', 'Inés Valdés', 'Laser cutter', 14),
        ]),
      ],
    });
    await expect
      .element(
        screen.getByRole('button', { name: 'Mark Inés Valdés as arrived, Lathe, 09:00–10:00' }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole('button', {
          name: 'Mark Inés Valdés as arrived, Laser cutter, 14:00–15:00',
        }),
      )
      .toBeVisible();
  });

  it('says so when nobody is booked today', async () => {
    const screen = await renderPage(<DeskPage />, {
      path: '/w/:slug',
      url: '/w/larkspur',
      mocks: [sheetMock([])],
    });
    await expect.element(screen.getByRole('heading', { name: 'No bookings today' })).toBeVisible();
  });
});
