# Design tokens and components (Larkspur)

Larkspur is the small design system both apps share. It lives in [`web/packages/ui`](../../web/packages/ui): CSS custom properties in [`tokens.css`](../../web/packages/ui/src/styles/tokens.css), element defaults in [`base.css`](../../web/packages/ui/src/styles/base.css), `k-`-prefixed component classes in [`components.css`](../../web/packages/ui/src/styles/components.css), and the React components exported from [`index.ts`](../../web/packages/ui/src/index.ts). Each app adds only its own layout classes ([member](../../web/apps/member/src/app.css), [kiosk](../../web/apps/kiosk/src/app.css)).

[`design-tokens.test.ts`](../../web/tests/unit/design-tokens.test.ts) keeps this page and the CSS in step: it recomputes every contrast ratio in the table below and fails if one drops under its minimum or no longer matches the number printed here, checks that the two copies of the dark palette are identical, that reduced motion zeroes every duration, and that every token is used somewhere outside `tokens.css` (Knip does not read CSS).

## Themes

- **Light** is the default (`:root`).
- **Dark** applies when the operating system asks for it (`@media (prefers-color-scheme: dark)` on `:root:not([data-theme='light'])`) or when the person picks it (`:root[data-theme='dark']`). Both blocks hold the same values.
- The theme button in the header ([`useTheme`](../../web/packages/ui/src/useTheme.ts)) cycles system → light → dark, sets `data-theme` on `<html>` and remembers the choice in `localStorage` (guarded, because storage can be blocked).
- `color-scheme` is set per theme, so native controls (select menus, scroll bars, the kiosk's progress bar) follow it.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `#faf7f2` | `#111614` | Page background |
| `--color-surface` | `#ffffff` | `#181e1b` | Cards, header, navigation, inputs, buttons |
| `--color-sunken` | `#f2eee6` | `#0c100e` | Notices, message previews, taken slots, hover on quiet buttons |
| `--color-text` | `#1c2321` | `#e9eeea` | Body text and headings |
| `--color-text-muted` | `#56605b` | `#a2ada7` | Secondary text, unselected tabs, muted pills |
| `--color-border` | `#dcd6cb` | `#2c3531` | Card and divider lines (decorative) |
| `--color-border-strong` | `#857e73` | `#68736d` | Borders that identify controls: inputs, slots, day chips, secondary buttons |
| `--color-primary` | `#2d6a4f` | `#74c69d` | Primary buttons, links, the chosen day, your booked slots, the usage bars |
| `--color-on-primary` | `#ffffff` | `#0b1f15` | Text and icons on `primary` |
| `--color-primary-soft` | `#dcebe3` | `#1d3a2c` | Pressed toggle buttons, hover on a free slot |
| `--color-accent` | `#9a4614` | `#f0a46b` | Current-tab underline, the landing page's eyebrow, the mark's bar |
| `--color-danger` | `#b42318` | `#f97066` | Errors, danger buttons, expired holds |
| `--color-danger-soft` | `#fbe4e1` | `#3d1d1a` | Error notice background, danger button hover |
| `--color-success` | `#26703f` | `#6ccb8f` | Success pills and messages |
| `--color-warning` | `#8a5300` | `#f5b94a` | Held pills, the hold card and held-slot borders |
| `--color-info` | `#2b5c8a` | `#7db4e6` | Manager pill |
| `--color-focus` | `#7a4fd6` | `#b79cff` | The focus outline |
| `--color-grid` | `rgb(28 35 33 / 0.07)` | `rgb(233 238 234 / 0.06)` | Dotted background on the landing pages (decorative) |

### Contrast

Ratios use the WCAG 2.x relative-luminance formula. Text needs 4.5:1 (WCAG 1.4.3); boundaries of controls and the focus outline need 3:1 against what is next to them (WCAG 1.4.11). Disabled controls (a past slot, a busy button at 50% opacity) are exempt and are not listed.

| Pair | Where it appears | Light | Dark | Minimum |
|---|---|---|---|---|
| `text` on `bg` | Body text on the page | 14.98:1 | 15.57:1 | 4.5:1 |
| `text` on `surface` | Body text on cards, header, inputs | 16.01:1 | 14.42:1 | 4.5:1 |
| `text` on `sunken` | Text on notices, previews, taken slots | 13.83:1 | 16.31:1 | 4.5:1 |
| `text` on `primary-soft` | Pressed toggle button label | 12.99:1 | 10.56:1 | 4.5:1 |
| `text` on `danger-soft` | Error notice text | 13.18:1 | 12.87:1 | 4.5:1 |
| `text-muted` on `bg` | Secondary text on the page | 6.10:1 | 7.90:1 | 4.5:1 |
| `text-muted` on `surface` | Secondary text on cards; muted pills | 6.52:1 | 7.31:1 | 4.5:1 |
| `text-muted` on `sunken` | Times of taken slots | 5.64:1 | 8.28:1 | 4.5:1 |
| `on-primary` on `primary` | Primary button, chosen day, your booked slot, skip link | 6.39:1 | 8.44:1 | 4.5:1 |
| `primary` on `bg` | Links on the page | 5.98:1 | 8.97:1 | 4.5:1 |
| `primary` on `surface` | Links and icons on cards | 6.39:1 | 8.31:1 | 4.5:1 |
| `primary` on `primary-soft` | Border of a pressed toggle button | 5.18:1 | 6.09:1 | 3:1 |
| `accent` on `bg` | Landing eyebrow text | 6.03:1 | 8.90:1 | 4.5:1 |
| `accent` on `surface` | Current-tab underline | 6.44:1 | 8.25:1 | 3:1 |
| `danger` on `surface` | Field errors, danger button, expired hold | 6.57:1 | 6.08:1 | 4.5:1 |
| `danger` on `danger-soft` | Danger button label on hover | 5.41:1 | 5.43:1 | 4.5:1 |
| `success` on `surface` | Success pills and messages | 6.05:1 | 8.53:1 | 4.5:1 |
| `warning` on `surface` | Held pills; hold card and held-slot borders | 6.33:1 | 9.61:1 | 4.5:1 |
| `info` on `surface` | Manager pill | 7.00:1 | 7.69:1 | 4.5:1 |
| `border-strong` on `surface` | Borders of inputs, slots and secondary buttons | 4.02:1 | 3.44:1 | 3:1 |
| `border-strong` on `bg` | Day-chip borders on the page | 3.76:1 | 3.71:1 | 3:1 |
| `focus` on `bg` | Focus outline on the page | 5.02:1 | 8.02:1 | 3:1 |
| `focus` on `surface` | Focus outline on cards | 5.36:1 | 7.43:1 | 3:1 |

`--color-border` (1.45:1 light, 1.34:1 dark against `surface`) is decorative: it outlines cards and separates lists, never the only edge of a control.

## Typography

| Token | Value | About | Used for |
|---|---|---|---|
| `--font-display` | Bricolage Grotesque (variable), then Avenir Next, system UI | | Headings, the brand |
| `--font-body` | Atkinson Hyperlegible, then system UI | | Everything else; chosen for distinct letter shapes (I, l, 1) |
| `--font-mono` | JetBrains Mono (variable), then system monospace | | Times, countdowns, slot lengths, template source |
| `--text-xs` | 0.75rem | 12px | Pills |
| `--text-sm` | 0.8125rem | 13px | Field labels, hints, machine details |
| `--text-md` | 0.875rem | 14px | Buttons, tabs, slots, notices |
| `--text-base` | 1rem | 16px | Body text and inputs |
| `--text-lg` | 1.25rem | 20px | Card headings, the brand, the lede |
| `--text-2xl` | 1.953rem | 31px | Page titles (`k-page-title`) |
| `--text-4xl` | 3.052rem | 49px | Landing headline (with `clamp()` down to `--text-2xl` on narrow screens) |
| `--leading-body` | 1.5 | | Body line height |
| `--leading-display` | 1.15 | | Heading line height |

The larger sizes follow a 1.25 ratio from 16px (20, 31 and 49px); the three small sizes are fixed steps for dense controls. Headings use weight 650 and −0.01em tracking; labels and buttons use 700. Fonts are bundled through Fontsource (SIL Open Font License), so nothing loads from a third-party origin.

## Spacing and layout

| Token | Value | Typical use |
|---|---|---|
| `--space-1` | 4px | Gaps inside fields and pills |
| `--space-2` | 8px | Gaps between chips, slots and buttons |
| `--space-3` | 12px | Notice and list padding |
| `--space-4` | 16px | Stack gap, page gutter |
| `--space-6` | 24px | Card padding, column gap |
| `--space-8` | 32px | Landing column gap |
| `--space-12` | 48px | Empty-state padding, bottom of the page |
| `--layout-max` | 1180px | Width of the content column (`k-main`) |
| `--layout-inline` | `max(16px, (100% − 1180px) / 2 + 16px)` | Inline padding of the header and the member navigation, so their contents line up with the content column at every width |

**Breakpoints.** The layouts change at three widths, all with `max-width` media queries, plus one container query:

| Where | Width | What changes |
|---|---|---|
| Header ([`components.css`](../../web/packages/ui/src/styles/components.css)) | below 600px | The product name and the signed-in person's name are hidden, so the bar never wraps or overflows |
| Usage table ([member `app.css`](../../web/apps/member/src/app.css)) | below 600px | The decorative bar column is hidden; the numbers stay |
| Kiosk ([kiosk `app.css`](../../web/apps/kiosk/src/app.css)) | 760px and below | One list at a time with an Expected / Arrived switch; the page scrolls instead of each list |
| Member layouts | 860px and below | The landing page, machine lanes and template editor go from two columns to one |
| Kiosk entry card | container 460px and wider | Time, name and button on one line; narrower columns put the time above the name |

**Sticky offset.** The hold tray sticks to the top of the booking page. While it is on screen it writes its height to `--sticky-offset` on `<html>`, which [`base.css`](../../web/packages/ui/src/styles/base.css) uses as `scroll-padding-top`, so a slot reached with Shift+Tab is scrolled into view below the tray, not under it (WCAG 2.4.11). This is a runtime value, not a token.

## Radius and shadow

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--radius-control` | 6px | 6px | Buttons, inputs, slots, notices |
| `--radius-card` | 10px | 10px | Cards, the hold card, table frame |
| `--radius-pill` | 999px | 999px | Pills, day chips, usage bars |
| `--shadow-1` | `0 1px 2px` warm 8% | none | Resting cards |
| `--shadow-2` | `0 4px 12px` + `0 1px 3px` warm | 1px `--color-border` ring | The hold card, which floats over the grid |

Dark mode drops shadows (they do not read on dark surfaces) and uses an outline ring for elevation.

## Motion

| Token | Value | Used for |
|---|---|---|
| `--duration-micro` | 120ms | Button and slot hover, the skip link, the outbox chevron |
| `--duration-standard` | 200ms | Kiosk entry fade |
| `--duration-enter` | 320ms | A new hold card sliding in |
| `--ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Every transition |

Under `prefers-reduced-motion: reduce` every duration token becomes `0ms`, so transitions and the entry animations finish instantly, and the loading skeleton's shimmer is switched off ([`components.css`](../../web/packages/ui/src/styles/components.css)). Nothing moves on its own except the countdown text.

## Focus

Every focusable element gets `outline: 2px solid var(--color-focus)` with a 2px offset on `:focus-visible` ([`base.css`](../../web/packages/ui/src/styles/base.css)); no component removes it. The outline meets 3:1 against both the page and cards in both themes (table above). The day strip pads its scroll box by 4px so the outline is not clipped.

## Component classes

| Class | Purpose |
|---|---|
| `k-shell`, `k-header`, `k-main` | Page frame: full-height column, top bar, centred content column |
| `k-brand`, `k-brand-sub`, `k-header-link`, `k-header-end`, `k-header-user` | Header contents |
| `k-tabs`, `k-tab` | Navigation tabs; the current one has `aria-current="page"` and an accent underline |
| `k-button` + `k-button-primary` / `-secondary` / `-ghost` / `-danger` | Button variants (use the `Button` component); `aria-pressed="true"` gets a filled, bordered look; `k-button-block` stretches it in a stack |
| `k-field`, `k-input`, `k-select`, `k-textarea`, `k-field-hint`, `k-field-error` | Form fields, at most 40rem wide |
| `k-card`, `k-notice`, `k-pill`, `k-empty`, `k-skeleton` | Surfaces for the components below |
| `k-table-scroll`, `k-num` | A focusable, labelled scroll box for tables; right-aligned tabular numbers |
| `k-stack`, `k-cluster` | Vertical rhythm (16px gap; buttons keep their width, paragraphs stop at 75 characters) and wrapping horizontal groups |
| `k-page-title`, `k-muted`, `k-mono`, `k-survey` | Page heading, secondary text, monospace, dotted background |
| `visually-hidden`, `skip-link` | Text for assistive technology only; the skip link appears on focus |

## Components

All are exported from [`@booking-kiosk/ui`](../../web/packages/ui/src/index.ts) and carry TSDoc on every prop.

| Component | Purpose | Props | Accessibility |
|---|---|---|---|
| [`AppHeader`](../../web/packages/ui/src/components/AppHeader.tsx) | Top bar of every page: skip link, brand, app navigation, theme switch, sign-out | `product`, `homeHref`, `children?`, `userName?`, `onSignOut?` | First focusable element is "Skip to content" (WCAG 2.4.1); the theme button's name states the current theme and the action |
| [`Button`](../../web/packages/ui/src/components/Button.tsx) | The one native `<button>` with Booking Kiosk's variants | `variant?` (`primary`, `secondary`, `ghost`, `danger`; default `secondary`), `icon?`, `busy?`, `ref?`, plus every native attribute | `type="button"` by default; `busy` disables it and sets `aria-busy`; at least 38px tall |
| [`Notice`](../../web/packages/ui/src/components/Notice.tsx) | Inline message | `tone?` (`info`, `error`, `success`), `id?` (for `aria-describedby`), `children` | Errors use `role="alert"`, the rest `role="status"`; tone shown by icon as well as colour |
| [`ErrorNotice`](../../web/packages/ui/src/components/ErrorNotice.tsx) | Error notice with a plain-words message and optional Try again | `error`, `onRetry?`, `children?` | Announced as an alert; a failed retry is reported by the caller's own state, never as an unhandled rejection |
| [`SignInPanel`](../../web/packages/ui/src/components/SignInPanel.tsx) | Email and password form plus one-click demo accounts | `heading`, `intro`, `demoAccounts` (`DemoAccount[]`: `label`, `email`) | Labelled fields with `autocomplete`; problems in an alert; demo buttons in a labelled group |
| [`TextField`](../../web/packages/ui/src/components/TextField.tsx) | Labelled input with hint and error | `label`, `error?`, `hint?`, plus every native input attribute except `id` | `useId` label link; `aria-invalid` and `aria-describedby` for hint and error |
| [`StatusPill`](../../web/packages/ui/src/components/StatusPill.tsx) | Small status label (Held, Confirmed, Delivered…) | `tone` (`success`, `warning`, `danger`, `info`, `muted`), `icon?`, `children` | Text plus icon, never colour alone (WCAG 1.4.1) |
| [`LoadingBlock`](../../web/packages/ui/src/components/States.tsx) | Skeleton lines while a view loads | `label`, `lines?` (default 4) | A labelled `status` region; the shimmer stops under reduced motion |
| [`EmptyState`](../../web/packages/ui/src/components/States.tsx) | What a list shows when it is empty, with a next step | `title`, `children?`, `icon?` | `h2` heading; decorative icon is `aria-hidden` |

Hooks and helpers in the same package: [`useTheme`](../../web/packages/ui/src/useTheme.ts) (theme choice; `web/public/theme-init.js` applies a saved one before the first paint), [`useDocumentTitle`](../../web/packages/ui/src/useDocumentTitle.ts) (page titles), [`useSignOut`](../../web/packages/ui/src/useSignOut.ts) (sign out, clear the cache, report failures), [`useNow`](../../web/packages/ui/src/useNow.ts) and [`useServerNow`](../../web/packages/ui/src/useServerNow.ts) (ticking clocks; the second follows the server's clock, [ADR 0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md)), and the workspace-time-zone formatters in [`time.ts`](../../web/packages/ui/src/time.ts).
