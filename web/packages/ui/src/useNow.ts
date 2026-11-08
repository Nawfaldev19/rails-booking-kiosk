// A ticking clock for components that show live times.
import { useEffect, useState } from 'react';

/**
 * The device's current time, refreshed every `intervalMs`.
 *
 * @param intervalMs - Tick length in milliseconds.
 * @defaultValue `intervalMs` is 1000.
 * @returns Epoch milliseconds from `Date.now()`.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
