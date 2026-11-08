// Applies a saved light or dark choice before the first paint, so a page never
// flashes the other theme. It is a separate file, not an inline script, because
// the Content Security Policy allows scripts from the app's own origin only.
// The storage key matches packages/ui/src/useTheme.ts.
(function () {
  try {
    var choice = window.localStorage.getItem('booking-kiosk.theme');
    if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  } catch {
    // Storage can be blocked; the system theme applies.
  }
})();
