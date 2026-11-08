import type { Workspace } from '../../apps/member/src/routes/workspace';

/** Wednesday 11 March 2026 in London, where the clock matches UTC. */
export const workspace: Workspace = {
  id: 'w1',
  name: 'Larkspur Makerspace',
  slug: 'larkspur',
  timeZone: 'Europe/London',
  today: '2026-03-11',
  opensAt: '09:00',
  closesAt: '21:00',
  holdMinutes: 5,
  maxActiveHolds: 3,
  bookingHorizonDays: 14,
  viewerRole: 'MEMBER',
};

export const managerWorkspace: Workspace = { ...workspace, viewerRole: 'MANAGER' };

const laser = { __typename: 'Machine' as const, id: 'm1', name: 'Laser cutter' };

/** A booking shaped like the BookingFields fragment. */
export function booking(
  id: string,
  {
    status = 'CONFIRMED',
    startsAt = '2026-03-11T14:00:00Z',
    endsAt = '2026-03-11T15:00:00Z',
    holdExpiresAt = null,
    machine = laser,
  }: {
    status?: 'HELD' | 'CONFIRMED' | 'CANCELLED';
    startsAt?: string;
    endsAt?: string;
    holdExpiresAt?: string | null;
    machine?: { __typename: 'Machine'; id: string; name: string };
  } = {},
) {
  return { __typename: 'Booking' as const, id, status, startsAt, endsAt, holdExpiresAt, machine };
}
