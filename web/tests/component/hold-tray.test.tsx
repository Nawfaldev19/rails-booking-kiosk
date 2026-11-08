import { InMemoryCache } from '@apollo/client';
import { confirmBookingMutation, myHoldsQuery, releaseHoldMutation } from '@booking-kiosk/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldTray } from '../../apps/member/src/booking/HoldTray';
import { booking, workspace } from './data';
import { renderPage } from './render';

const NOW = '2026-03-11T13:00:00Z';

function holds(list: ReturnType<typeof booking>[], serverTime = NOW) {
  return {
    request: { query: myHoldsQuery, variables: { slug: 'larkspur' } },
    result: {
      data: {
        serverTime,
        workspace: { __typename: 'Workspace' as const, id: 'w1', myHolds: list },
      },
    },
  };
}

const heldLaser = booking('h1', { status: 'HELD', holdExpiresAt: '2026-03-11T13:05:00Z' });

function payload(name: 'confirmBooking' | 'releaseHold', typename: string, status: string) {
  return {
    data: {
      [name]: {
        __typename: typename,
        booking: { ...heldLaser, status, holdExpiresAt: null },
        errors: [],
      },
    },
  };
}

function renderTray(mocks: Parameters<typeof renderPage>[1]['mocks']) {
  return renderPage(<HoldTray workspace={workspace} onChanged={vi.fn()} />, { mocks });
}

describe('HoldTray', () => {
  beforeEach(() => {
    // Fake only the clock and the countdown's interval; Apollo and the
    // assertion polling keep their real timeouts.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down every second', async () => {
    const screen = await renderTray([holds([heldLaser])]);
    await expect.element(screen.getByText('Held for 5:00')).toBeVisible();
    vi.advanceTimersByTime(1000);
    await expect.element(screen.getByText('Held for 4:59')).toBeVisible();
    vi.advanceTimersByTime(65_000);
    await expect.element(screen.getByText('Held for 3:54')).toBeVisible();
  });

  it('warns once with a minute to go, then offers to hold the slot again', async () => {
    const screen = await renderTray([holds([heldLaser])]);
    await expect.element(screen.getByText('Held for 5:00')).toBeVisible();
    vi.advanceTimersByTime(4 * 60_000 + 1000);
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'Less than a minute' }))
      .toHaveTextContent('Less than a minute left to confirm Laser cutter, 14:00.');

    vi.advanceTimersByTime(60_000);
    await expect.element(screen.getByText('Hold expired')).toBeVisible();
    await expect.element(screen.getByRole('button', { name: /^Confirm/ })).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Hold Laser cutter, 14:00 again' }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'expired' }))
      .toHaveTextContent('Your hold on Laser cutter, 14:00 has expired.');
  });

  it('counts down on the server clock when the device clock is wrong', async () => {
    // The server is two minutes ahead of this device, so three minutes are left.
    const screen = await renderTray([holds([heldLaser], '2026-03-11T13:02:00Z')]);
    await expect.element(screen.getByText('Held for 3:00')).toBeVisible();
  });

  it('never measures the clock from a cached answer, however old', async () => {
    // A cached serverTime ten minutes old would make the hold look ten minutes longer.
    const cache = new InMemoryCache();
    const stale = holds([heldLaser], '2026-03-11T12:50:00Z');
    cache.writeQuery({ ...stale.request, data: stale.result.data });
    const screen = await renderPage(<HoldTray workspace={workspace} onChanged={vi.fn()} />, {
      cache,
      mocks: [{ ...holds([heldLaser], '2026-03-11T13:00:30Z'), delay: 200 }],
    });
    await expect.element(screen.getByText('Held for 5:00')).toBeVisible();
    // The network answer says the server is 30 seconds ahead of this device.
    await expect.element(screen.getByText('Held for 4:30')).toBeVisible();
  });

  it('confirms a hold, empties the tray and keeps focus on the outcome', async () => {
    const screen = await renderTray([
      holds([heldLaser]),
      {
        request: { query: confirmBookingMutation, variables: { bookingId: 'h1' } },
        result: payload('confirmBooking', 'ConfirmBookingPayload', 'CONFIRMED'),
      },
      holds([]),
    ]);
    await screen.getByRole('button', { name: 'Confirm Laser cutter, 14:00' }).click();
    const outcome = screen.getByText('Booked: Laser cutter. A confirmation is on its way.');
    await expect.element(outcome).toBeVisible();
    await expect.element(outcome).toHaveFocus();
    await expect.element(screen.getByText(/Held for/)).not.toBeInTheDocument();
  });

  it('only shows the card being released as busy', async () => {
    const other = booking('h2', {
      status: 'HELD',
      startsAt: '2026-03-11T16:00:00Z',
      endsAt: '2026-03-11T17:00:00Z',
      holdExpiresAt: '2026-03-11T13:04:00Z',
    });
    const screen = await renderTray([
      holds([heldLaser, other]),
      {
        request: { query: releaseHoldMutation, variables: { bookingId: 'h1' } },
        result: payload('releaseHold', 'ReleaseHoldPayload', 'RELEASED'),
        delay: 300,
      },
      holds([other]),
    ]);
    await screen.getByRole('button', { name: 'Release Laser cutter, 14:00' }).click();
    await expect
      .element(screen.getByRole('button', { name: 'Release Laser cutter, 14:00' }))
      .toHaveAttribute('aria-busy', 'true');
    await expect
      .element(screen.getByRole('button', { name: 'Release Laser cutter, 16:00' }))
      .not.toHaveAttribute('aria-busy');
    await expect.element(screen.getByText('Hold released.')).toBeVisible();
    await expect
      .element(screen.getByRole('button', { name: 'Release Laser cutter, 14:00' }))
      .not.toBeInTheDocument();
  });

  it('reserves scroll space under itself while on screen, so focus is never hidden by it', async () => {
    const offset = () => document.documentElement.style.getPropertyValue('--sticky-offset');
    const screen = await renderTray([holds([heldLaser])]);
    await expect.element(screen.getByText('Held for 5:00')).toBeVisible();
    const tray = screen.getByRole('complementary', { name: 'Your holds' }).element();
    await expect.poll(offset).toBe(`${String((tray as HTMLElement).offsetHeight + 16)}px`);
    await screen.unmount();
    expect(offset()).toBe('');
  });
});
