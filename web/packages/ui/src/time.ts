/**
 * Date helpers that never let the browser's own time zone leak in. Times are
 * shown in the workspace's zone; calendar dates ("2026-03-11") stay dates.
 * Formatters are cached per zone, because building an `Intl.DateTimeFormat` is
 * far slower than using one.
 */

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The 24-hour wall-clock time of an instant in a given zone.
 *
 * @param iso - An ISO 8601 instant, as the API returns it.
 * @param timeZone - An IANA zone name, normally the workspace's.
 * @returns The time as `HH:MM`.
 * @example
 * ```ts
 * formatTime('2026-03-10T13:00:00Z', 'Europe/London'); // "13:00"
 * ```
 */
export function formatTime(iso: string, timeZone: string): string {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter.format(new Date(iso));
}

/**
 * A slot's start and end as one label, such as `14:00–15:00`.
 *
 * @param startIso - The start instant (ISO 8601).
 * @param endIso - The end instant (ISO 8601).
 * @param timeZone - An IANA zone name.
 */
export function formatTimeRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatTime(startIso, timeZone)}–${formatTime(endIso, timeZone)}`;
}

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const longDayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

function parseDate(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`Not a calendar date: ${isoDate}`);
  return new Date(`${isoDate}T00:00:00Z`);
}

/**
 * "Wed 11 Mar" for a calendar date, independent of the viewer's zone.
 *
 * @param isoDate - A calendar date, `YYYY-MM-DD`.
 * @throws Error when `isoDate` is not shaped like `YYYY-MM-DD`.
 */
export function formatDay(isoDate: string): string {
  return dayFormatter.format(parseDate(isoDate));
}

/**
 * "Wednesday 11 March" for a calendar date, independent of the viewer's zone.
 *
 * @param isoDate - A calendar date, `YYYY-MM-DD`.
 * @throws Error when `isoDate` is not shaped like `YYYY-MM-DD`.
 */
export function formatLongDay(isoDate: string): string {
  return longDayFormatter.format(parseDate(isoDate));
}

/**
 * The calendar date `days` after `isoDate`.
 *
 * @remarks
 * The arithmetic runs in UTC on a date with no time part, so it never gains or
 * loses a day across a daylight-saving change.
 * @param isoDate - A calendar date, `YYYY-MM-DD`.
 * @param days - How many days to add; negative values go back.
 * @throws Error when `isoDate` is not shaped like `YYYY-MM-DD`.
 * @example
 * ```ts
 * addDays('2026-03-31', 1); // "2026-04-01"
 * ```
 */
export function addDays(isoDate: string, days: number): string {
  const date = parseDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The calendar date of an instant in a given zone.
 *
 * @param iso - An ISO 8601 instant.
 * @param timeZone - An IANA zone name.
 * @returns The date as `YYYY-MM-DD`.
 * @example
 * ```ts
 * dateInZone('2026-03-10T23:30:00Z', 'Europe/Berlin'); // "2026-03-11"
 * ```
 */
export function dateInZone(iso: string, timeZone: string): string {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    // en-CA formats dates as YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    });
    dateFormatters.set(timeZone, formatter);
  }
  return formatter.format(new Date(iso));
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * "10 Mar 2026, 12:05" for an instant, in the given zone.
 *
 * @param iso - An ISO 8601 instant.
 * @param timeZone - An IANA zone name.
 */
export function formatDateTime(iso: string, timeZone: string): string {
  let formatter = dateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone,
    });
    dateTimeFormatters.set(timeZone, formatter);
  }
  return formatter.format(new Date(iso));
}

/**
 * Whole seconds from `nowMs` until `iso`, rounded up and never negative.
 *
 * @param iso - The target instant (ISO 8601), such as a hold's expiry.
 * @param nowMs - The current time in epoch milliseconds (from the server's clock where it matters).
 * @example
 * ```ts
 * secondsUntil('2026-03-10T12:05:00Z', Date.parse('2026-03-10T12:00:00Z')); // 300
 * ```
 */
export function secondsUntil(iso: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - nowMs) / 1000));
}

/**
 * A countdown label in minutes and seconds.
 *
 * @param totalSeconds - A non-negative number of whole seconds.
 * @example
 * ```ts
 * formatCountdown(245); // "4:05"
 * ```
 */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
