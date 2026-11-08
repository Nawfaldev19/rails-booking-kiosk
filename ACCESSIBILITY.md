# Accessibility

**Target:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA, with widgets following the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/). This describes what was built and checked; it is not a conformance claim.

## Built in

- A "Skip to content" link first on every page, and a distinct `document.title` per page; in the member app a polite region reads the new title after each in-app navigation.
- Native controls throughout. Repeated buttons name what they act on: "Mark Ines Valdés as arrived, Wood lathe, 11:00–12:00", "Cancel Laser cutter, Thursday 12 March, 10:00–11:00…", "Remove Jules Fenwick…".
- The workspace switcher changes nothing until **Go** is pressed (WCAG 3.2.2).
- Status never relies on colour alone; errors are announced in `role="alert"`, other outcomes in polite status regions; when an action removes the focused control, focus moves to the next sensible place.
- Form errors are linked to their fields with `aria-describedby`; the template editor marks both fields invalid and links them to its list of problems.
- Light, dark and system themes from one [token set](docs/reference/design-tokens.md); a saved choice applies before the first paint.
- No sideways scrolling at phone and tablet widths; the sticky hold tray reserves its height as scroll padding, so focus is never hidden under it (WCAG 2.4.11).
- Durations drop to 0 ms under `prefers-reduced-motion: reduce`.

## How it is checked

| Check | Where | Runs in `make verify` |
|---|---|---|
| Contrast of 23 documented colour pairs in both themes (4.5:1 text, 3:1 non-text) | [`design-tokens.test.ts`](web/tests/unit/design-tokens.test.ts) | yes |
| Keyboard focus, announcements and accessible names | component tests, and every end-to-end test finds controls by role and name ([traceability](docs/testing/traceability.md)) | yes |
| No sideways scrolling at 375px and 768px; focus never under the hold tray | [`responsive.spec.ts`](web/e2e/responsive.spec.ts) | yes |
| Page titles and route announcements; saved theme before scripts run | [`member.spec.ts`](web/e2e/member.spec.ts), [`theme.spec.ts`](web/e2e/theme.spec.ts) | yes |
| axe-core audit of both built apps | [how-to/audit-accessibility.md](docs/how-to/audit-accessibility.md); last run 2026-10-18: 0 violations across 28 page states | no (axe-core is MPL-2.0) |

## Known limitations

- No manual testing with a screen reader has been recorded.
- The booking grid is a set of buttons per machine, not an ARIA grid; arrow keys do not move between slots.
- The kiosk does not announce in-app navigation (it has two routes, each with its own title).

## Report a barrier

Open an issue with the bug report template, saying what you tried, your assistive technology and browser, and what happened. If the barrier exposes personal data, report it privately as described in [SECURITY.md](SECURITY.md).
