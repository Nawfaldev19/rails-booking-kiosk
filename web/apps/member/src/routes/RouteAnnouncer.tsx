// Tells screen-reader users which page they are on after an in-app navigation.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/** The title as it is read out: without the trailing product name. */
function spokenTitle(): string {
  return document.title.replace(/ · Booking Kiosk$/, '');
}

/**
 * A polite live region that reads out the page title after each route change.
 *
 * @remarks
 * A full page load announces the title by itself; client-side navigation does
 * not, so this repeats it. Pages set `document.title` themselves (see
 * `useDocumentTitle`), sometimes only once their data has loaded, so after a
 * route change the region follows the `<title>` element until the next one.
 * Render it after the routed outlet: effects run in tree order, so the page's
 * title is already set when this one runs.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const region = useRef<HTMLParagraphElement>(null);
  const spoken = useRef<string | null>(null);
  const shownPath = useRef(pathname);

  useEffect(() => {
    if (spoken.current === null || shownPath.current === pathname) {
      spoken.current ??= spokenTitle();
      return;
    }
    shownPath.current = pathname;
    const announce = () => {
      const text = spokenTitle();
      if (region.current && text !== spoken.current) {
        region.current.textContent = text;
        spoken.current = text;
      }
    };
    announce();
    const title = document.querySelector('title');
    if (!title) return;
    const observer = new MutationObserver(announce);
    observer.observe(title, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return <p ref={region} role="status" className="visually-hidden" />;
}
