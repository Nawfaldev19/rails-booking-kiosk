import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateInZone,
  formatCountdown,
  formatDateTime,
  formatDay,
  formatLongDay,
  formatTime,
  formatTimeRange,
  secondsUntil,
} from '../../packages/ui/src/time';

describe('time helpers', () => {
  it('formats instants in the workspace zone, not the machine zone', () => {
    const iso = '2026-03-11T09:00:00Z';
    expect(formatTime(iso, 'Europe/London')).toBe('09:00');
    expect(formatTime(iso, 'America/Toronto')).toBe('05:00');
    expect(formatTimeRange(iso, '2026-03-11T10:30:00Z', 'Europe/London')).toBe('09:00–10:30');
  });

  it('crosses daylight-saving changes correctly', () => {
    // London switches to BST at 01:00 UTC on 29 March 2026.
    expect(formatTime('2026-03-29T00:30:00Z', 'Europe/London')).toBe('00:30');
    expect(formatTime('2026-03-29T01:30:00Z', 'Europe/London')).toBe('02:30');
  });

  it('keeps calendar dates as dates', () => {
    expect(formatDay('2026-03-11')).toBe('Wed 11 Mar');
    expect(formatLongDay('2026-03-11')).toBe('Wednesday 11 March');
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(() => formatDay('11/03/2026')).toThrow(/calendar date/);
  });

  it('formats a timestamp in the workspace zone', () => {
    expect(formatDateTime('2026-07-01T11:30:00Z', 'Europe/London')).toBe('1 Jul 2026, 12:30');
    expect(formatDateTime('2026-07-01T11:30:00Z', 'America/Toronto')).toBe('1 Jul 2026, 07:30');
  });

  it('finds the local date of an instant', () => {
    expect(dateInZone('2026-03-11T03:00:00Z', 'America/Toronto')).toBe('2026-03-10');
    expect(dateInZone('2026-03-11T03:00:00Z', 'Europe/London')).toBe('2026-03-11');
  });

  it('counts down to an expiry and never goes negative', () => {
    const now = Date.parse('2026-03-11T09:00:00Z');
    expect(secondsUntil('2026-03-11T09:04:05Z', now)).toBe(245);
    expect(secondsUntil('2026-03-11T08:59:00Z', now)).toBe(0);
    expect(formatCountdown(245)).toBe('4:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
