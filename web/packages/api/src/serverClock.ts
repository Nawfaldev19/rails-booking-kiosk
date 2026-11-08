// How far the server's clock is from this device's, measured from live API responses.
import { ApolloLink } from '@apollo/client';
import { map } from 'rxjs';

let offsetMs = 0;
let measuredAtMs = 0;
const listeners = new Set<() => void>();

/**
 * Records a `serverTime` that has just arrived from the network.
 *
 * @remarks
 * The offset is taken against `Date.now()` at the moment the response arrives,
 * never against a cached answer or the last countdown tick, so it is never
 * older than the response it came from. The response's time in transit makes
 * the server look a few milliseconds behind, well inside the countdown's
 * one-second resolution.
 *
 * @param serverTime - An ISO 8601 instant from the API.
 * @param receivedAt - Epoch milliseconds on this device when it arrived.
 * @defaultValue `receivedAt` is `Date.now()`.
 */
export function recordServerTime(serverTime: string, receivedAt = Date.now()): void {
  const parsed = Date.parse(serverTime);
  if (Number.isNaN(parsed)) return;
  offsetMs = parsed - receivedAt;
  measuredAtMs = receivedAt;
  for (const listener of listeners) listener();
}

/**
 * Milliseconds to add to this device's clock to get the server's, or 0 before
 * any response has carried a `serverTime`.
 */
export function serverClockOffset(): number {
  return offsetMs;
}

/**
 * When, on this device's clock, the current offset was measured (epoch
 * milliseconds), or 0 before any measurement. A ticking clock older than this
 * is behind the measurement and should not be used with it.
 */
export function serverClockMeasuredAt(): number {
  return measuredAtMs;
}

/**
 * Calls `listener` whenever a new offset is recorded (the shape `useSyncExternalStore` expects).
 *
 * @returns A function that stops the calls.
 */
export function subscribeToServerClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * An Apollo link that records `serverTime` from every network result passing
 * through it. Results read from the cache never pass through a link, so a
 * cached, minutes-old `serverTime` can never skew a countdown.
 *
 * @see docs/adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md
 */
export const serverClockLink = new ApolloLink((operation, forward) =>
  forward(operation).pipe(
    map((result) => {
      const serverTime = (result.data as { serverTime?: unknown } | null | undefined)?.serverTime;
      if (typeof serverTime === 'string') recordServerTime(serverTime);
      return result;
    }),
  ),
);
