// The light, dark or system theme choice, remembered per browser.
import { useCallback, useEffect, useState } from 'react';

/** The theme a person picked; `system` follows the operating system setting. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'booking-kiosk.theme';
const ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];

function readChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * The current theme choice and a function that cycles system → light → dark.
 *
 * @remarks
 * The choice is applied as `data-theme` on the root element and stored in
 * `localStorage`. Storage can be blocked, so every read and write is guarded
 * and the theme still applies for the visit.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === 'system') window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, choice);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system');
  }, []);

  return { choice, cycle };
}
