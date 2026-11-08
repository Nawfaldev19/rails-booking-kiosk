import { CombinedGraphQLErrors } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import { searchable, splitDaySheet, type DaySheetEntry } from '../../apps/kiosk/src/daySheet';
import { holdErrorMessage, presentSlot } from '../../apps/member/src/booking/slots';
import { workspaceFromPath } from '../../packages/api/src/client';
import { describeFailure, errorCode, firstUserError } from '../../packages/api/src/errors';

function entry(
  id: string,
  member: string,
  machine: string,
  startsAt: string,
  arrivedAt: string | null = null,
): DaySheetEntry {
  return {
    id,
    startsAt,
    endsAt: startsAt,
    arrivedAt,
    machine: { id: `m-${machine}`, name: machine },
    member: { name: member },
  };
}

describe('splitDaySheet', () => {
  const sheet = [
    entry('1', 'Inés Valdés', 'Wood lathe', '2026-03-11T11:00:00Z'),
    entry('2', 'Sam Okafor', 'Laser cutter', '2026-03-11T09:00:00Z', '2026-03-11T08:55:00Z'),
    entry('3', 'Kit Marlowe', 'Laser cutter', '2026-03-11T10:00:00Z'),
    entry('4', 'Robin Ash', '3D printer', '2026-03-11T08:00:00Z', '2026-03-11T08:10:00Z'),
  ];

  it('splits by arrival, sorting expected by start and arrived by latest arrival', () => {
    const result = splitDaySheet(sheet, '');
    expect(result.expected.map((e) => e.id)).toEqual(['3', '1']);
    expect(result.arrived.map((e) => e.id)).toEqual(['2', '4']);
    expect(result).toMatchObject({ total: 4, arrivedCount: 2 });
  });

  it('searches member and machine names, ignoring case and accents', () => {
    expect(splitDaySheet(sheet, 'ines').expected.map((e) => e.id)).toEqual(['1']);
    expect(splitDaySheet(sheet, '  LASER ').expected.map((e) => e.id)).toEqual(['3']);
    expect(splitDaySheet(sheet, 'laser').arrived.map((e) => e.id)).toEqual(['2']);
  });

  it('keeps totals independent of the search', () => {
    expect(splitDaySheet(sheet, 'nobody')).toMatchObject({
      expected: [],
      arrived: [],
      total: 4,
      arrivedCount: 2,
    });
    expect(searchable('Ángel Ñúñez')).toBe('angel nunez');
  });
});

describe('slot presentation', () => {
  it('only lets free slots be chosen', () => {
    expect(presentSlot('FREE')).toMatchObject({ selectable: true, tone: 'free' });
    for (const state of ['TAKEN', 'HELD_BY_YOU', 'BOOKED_BY_YOU', 'PAST'] as const) {
      expect(presentSlot(state).selectable).toBe(false);
    }
  });

  it('rewrites the race-lost error and keeps others', () => {
    expect(holdErrorMessage('SLOT_TAKEN', 'x')).toMatch(/Someone else got that slot first/);
    expect(holdErrorMessage('SLOT_IN_PAST', 'x')).toMatch(/just started/);
    expect(holdErrorMessage('HOLD_LIMIT_REACHED', 'You can hold at most 3')).toBe(
      'You can hold at most 3',
    );
    expect(holdErrorMessage('ANYTHING', 'fallback')).toBe('fallback');
  });
});

describe('api helpers', () => {
  it('reads the workspace slug from the path', () => {
    expect(workspaceFromPath('/w/larkspur')).toBe('larkspur');
    expect(workspaceFromPath('/w/wharf-street/bookings')).toBe('wharf-street');
    expect(workspaceFromPath('/')).toBeNull();
    expect(workspaceFromPath('/w/UPPER')).toBeNull();
  });

  it('picks the first typed error and describes failures', () => {
    expect(firstUserError([])).toBeNull();
    expect(firstUserError(null)).toBeNull();
    expect(
      firstUserError([
        { code: 'A', message: 'a' },
        { code: 'B', message: 'b' },
      ]),
    ).toEqual({ code: 'A', message: 'a' });
    expect(describeFailure(new TypeError('Failed to fetch'))).toMatch(/Cannot reach the server/);
    expect(describeFailure(new Error('Boom'))).toBe('Boom');
    expect(describeFailure('weird')).toMatch(/Something went wrong/);
  });

  it('reads the code of a query-level GraphQL error', () => {
    const forbidden = new CombinedGraphQLErrors({
      errors: [{ message: 'No', extensions: { code: 'FORBIDDEN' } }],
    });
    expect(errorCode(forbidden)).toBe('FORBIDDEN');
    expect(errorCode(new CombinedGraphQLErrors({ errors: [{ message: 'No code' }] }))).toBeNull();
    expect(errorCode(new TypeError('Failed to fetch'))).toBeNull();
  });
});
