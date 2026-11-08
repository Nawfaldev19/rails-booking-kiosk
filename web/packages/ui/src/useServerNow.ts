// The current time on the server's clock, for countdowns and "today".
import {
  serverClockMeasuredAt,
  serverClockOffset,
  subscribeToServerClock,
} from '@booking-kiosk/api';
import { useSyncExternalStore } from 'react';
import { useNow } from './useNow';

/**
 * The current time on the server's clock, refreshed every `intervalMs`.
 *
 * The offset between the server's clock and this device's comes from the
 * latest network response that carried `serverTime` (see `serverClockLink`),
 * so a device clock that is minutes off does not end a countdown early or
 * late, and a cached response can never feed it an old reading.
 *
 * @param intervalMs - Tick length in milliseconds.
 * @defaultValue `intervalMs` is 1000.
 * @returns Epoch milliseconds on the server's clock.
 * @see docs/adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md
 */
export function useServerNow(intervalMs = 1000): number {
  const now = useNow(intervalMs);
  const offset = useSyncExternalStore(subscribeToServerClock, serverClockOffset);
  const measuredAt = useSyncExternalStore(subscribeToServerClock, serverClockMeasuredAt);
  // The last tick can be up to a second older than the response just measured;
  // never count from before the measurement, or a new hold would read longer
  // than its hold time.
  return Math.max(now, measuredAt) + offset;
}
