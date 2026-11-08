// One document title per page, so tabs, history and screen readers can tell pages apart.
import { useEffect } from 'react';

/**
 * Sets `document.title` to the non-empty parts given, joined with " · " and ending in "Booking Kiosk".
 *
 * @remarks
 * A single-page app keeps one HTML document, so without this every route
 * would share the title from `index.html` (WCAG 2.4.2 Page Titled). The
 * previous title comes back when the page unmounts.
 *
 * @param parts - From the most specific, such as `['My bookings', 'Larkspur Makerspace']`.
 * @example
 * ```ts
 * useDocumentTitle('Team', workspace.name); // "Team · Larkspur Makerspace · Booking Kiosk"
 * ```
 */
export function useDocumentTitle(...parts: readonly string[]): void {
  const title = [...parts.filter((part) => part !== ''), 'Booking Kiosk'].join(' · ');
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
