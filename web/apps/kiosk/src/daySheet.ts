// Pure logic for the front-desk list: splitting today's bookings and searching them.
import type { DaySheetQuery } from '@booking-kiosk/api';

/** One of today's confirmed bookings, as the `DaySheet` query returns it. */
export type DaySheetEntry = NonNullable<DaySheetQuery['workspace']>['daySheet'][number];

/**
 * Lower-case, accent-free text so "ines" finds "Inés".
 *
 * @param text - Any display text, such as a member or machine name.
 * @example
 * ```ts
 * searchable('Inés Ábalos'); // "ines abalos"
 * ```
 */
export function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Today's list split for the kiosk's two columns. */
export interface SplitSheet {
  /** Not yet arrived and matching the search, soonest start first. */
  readonly expected: readonly DaySheetEntry[];
  /** Arrived and matching the search, latest arrival first. */
  readonly arrived: readonly DaySheetEntry[];
  /** Every booking today, ignoring the search. */
  readonly total: number;
  /** Every arrival today, ignoring the search. */
  readonly arrivedCount: number;
}

/**
 * Splits today's bookings into "expected" and "arrived", filtered by a search
 * over member and machine names. Totals ignore the search so progress stays true.
 *
 * @param entries - Today's bookings from the `DaySheet` query.
 * @param search - What staff typed; matched accent- and case-insensitively.
 * @remarks Runs in O(n log n) for n bookings; a day has at most a few hundred.
 */
export function splitDaySheet(entries: readonly DaySheetEntry[], search: string): SplitSheet {
  const needle = searchable(search.trim());
  const matches = (entry: DaySheetEntry) =>
    needle === '' || searchable(`${entry.member.name} ${entry.machine.name}`).includes(needle);
  const visible = entries.filter(matches);
  const byStart = (a: DaySheetEntry, b: DaySheetEntry) => a.startsAt.localeCompare(b.startsAt);
  const byArrival = (a: DaySheetEntry, b: DaySheetEntry) =>
    (b.arrivedAt ?? '').localeCompare(a.arrivedAt ?? '');
  return {
    expected: visible.filter((e) => !e.arrivedAt).sort(byStart),
    arrived: visible.filter((e) => e.arrivedAt).sort(byArrival),
    total: entries.length,
    arrivedCount: entries.filter((e) => e.arrivedAt).length,
  };
}
