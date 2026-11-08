# Feature catalogue

Every user-facing feature: what it is and why, where the code lives, how it works and which tests prove it. IDs are stable and shared with the README and [traceability.md](../testing/traceability.md). Paths are relative to this file.

## F-01 Sign-in, sessions and passwords

- **What and why:** email and password sign-in in both apps, one-click demo accounts, sign-out, and an Account page to change one's password. Every action is tied to a person and a role.
- **Where:** [`SignIn`](../../api/app/graphql/mutations/sign_in.rb), [`ChangePassword`](../../api/app/graphql/mutations/change_password.rb), [`GraphqlController`](../../api/app/controllers/graphql_controller.rb), [`User`](../../api/app/models/user.rb), [`RateLimiter`](../../api/app/models/rate_limiter.rb), [`ClientAddress`](../../api/app/models/client_address.rb), [`SignInPanel`](../../web/packages/ui/src/components/SignInPanel.tsx), [`AccountPage`](../../web/apps/member/src/account/AccountPage.tsx).
- **How:** an encrypted HTTP-only `SameSite=Lax` cookie holds a session token that expires two idle hours after the last request, 12 hours after sign-in, and when the password changes. Failed password checks are limited to 10 per account and 50 per client address every 5 minutes; successful ones are refunded. Sign-out clears the Apollo cache.
- **Tests:** [`auth_and_transport_spec.rb`](../../api/spec/requests/auth_and_transport_spec.rb), [`team_spec.rb`](../../api/spec/requests/team_spec.rb) ("changing one's own password"), [`models_spec.rb`](../../api/spec/models/models_spec.rb) (`RateLimiter`, `ClientAddress`), [`sign-in.test.tsx`](../../web/tests/component/sign-in.test.tsx), [`account.test.tsx`](../../web/tests/component/account.test.tsx), [`team.spec.ts`](../../web/e2e/team.spec.ts).
- **ADRs:** [0007](../adr/0007-same-origin-clients-cookie-sessions-and-strict-headers.md).
- **Accessibility:** labelled fields with `autocomplete`, errors on their fields or in an alert region.

## F-02 Workspaces, roles and isolation

- **What and why:** several makerspaces share one service; a person can belong to several, with a role in each (member, staff, manager), and switch between them. No workspace sees another's data.
- **Where:** [`Tenant`](../../api/app/models/tenant.rb), [`Policy`](../../api/app/models/policy.rb), [`QueryType#workspace`](../../api/app/graphql/types/query_type.rb), composite keys in the [migrations](../../api/db/migrate), [`WorkspaceLayout`](../../web/apps/member/src/routes/WorkspaceLayout.tsx), [`client.ts`](../../web/packages/api/src/client.ts).
- **How:** resolvers reach data only through a `Tenant`, which exists only for a real membership. Each `workspace(slug:)` field scopes its own subtree to its tenant; mutations name the workspace in the `X-Booking-Kiosk-Workspace` header. Composite foreign keys stop any record pointing into another workspace. A foreign ID is `NOT_FOUND`.
- **Tests:** [`tenant_isolation_spec.rb`](../../api/spec/requests/tenant_isolation_spec.rb), [`constraints_spec.rb`](../../api/spec/db/constraints_spec.rb), [`models_spec.rb`](../../api/spec/models/models_spec.rb) (`Tenant`), [`member.spec.ts`](../../web/e2e/member.spec.ts).
- **ADRs:** [0003](../adr/0003-tenant-isolation-through-a-scoped-access-object-and-composite-keys.md).
- **Accessibility:** the switcher is a labelled `select` that changes nothing until **Go** is pressed (WCAG 3.2.2).

## F-03 Slot grid and day strip

- **What and why:** today and the next 13 days as day buttons, and every in-service machine's slots for the chosen day, so members see at a glance what is free.
- **Where:** [`Bookings::Availability`](../../api/app/services/bookings/availability.rb), [`Bookings::SlotRules`](../../api/app/services/bookings/slot_rules.rb), [`Workspace`](../../api/app/models/workspace.rb), [`BookPage`](../../web/apps/member/src/booking/BookPage.tsx), [`DayStrip`](../../web/apps/member/src/booking/DayStrip.tsx), [`time.ts`](../../web/packages/ui/src/time.ts).
- **How:** opening hours are built from local wall-clock times, so daylight-saving days still open on time. The grid uses two queries whatever the number of machines, polls every 30 seconds and refetches after each hold attempt. "Today" moves on at midnight on the server's clock.
- **Tests:** [`bookings_spec.rb`](../../api/spec/services/bookings_spec.rb), [`models_spec.rb`](../../api/spec/models/models_spec.rb) (`Workspace`), [`book.test.tsx`](../../web/tests/component/book.test.tsx), [`time.test.ts`](../../web/tests/unit/time.test.ts), [`logic.test.ts`](../../web/tests/unit/logic.test.ts).
- **ADRs:** [0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md).
- **Accessibility:** each slot button is named by machine, time and state; day chips use `aria-pressed`.

## F-04 Expiring holds that cannot collide

- **What and why:** a free slot is held for the workspace's hold time (5 minutes in the seed data) while the member confirms; the tray counts down, warns a minute before the end and offers "Hold again". Two people can never get one slot.
- **Where:** [`Bookings::PlaceHold`](../../api/app/services/bookings/place_hold.rb), [`Bookings::Release`](../../api/app/services/bookings/release.rb), [`Booking`](../../api/app/models/booking.rb), [`HoldTray`](../../web/apps/member/src/booking/HoldTray.tsx), [`serverClock.ts`](../../web/packages/api/src/serverClock.ts), [`useServerNow`](../../web/packages/ui/src/useServerNow.ts).
- **How:** a Postgres exclusion constraint rejects overlapping active bookings, reported as `SLOT_TAKEN`. Expired holds stop counting the instant they expire. A per-member record lock keeps the hold limit exact; a shared lock on the machine keeps holds off a machine being retired. The countdown uses an offset measured from live responses only.
- **Tests:** [`concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb), [`bookings_spec.rb`](../../api/spec/services/bookings_spec.rb), [`constraints_spec.rb`](../../api/spec/db/constraints_spec.rb), [`hold-tray.test.tsx`](../../web/tests/component/hold-tray.test.tsx), [`server-clock.test.ts`](../../web/tests/unit/server-clock.test.ts), [`member.spec.ts`](../../web/e2e/member.spec.ts) (two browsers, one slot).
- **ADRs:** [0001](../adr/0001-prevent-double-booking-with-an-exclusion-constraint.md), [0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md).
- **Accessibility:** a new hold is announced and its Confirm button takes focus; a polite region warns at one minute and at expiry.

## F-05 Confirming, cancelling and My bookings

- **What and why:** confirm a hold; list upcoming and past bookings ten at a time; cancel a booking that has not started, after a confirmation step.
- **Where:** [`Bookings::Confirm`](../../api/app/services/bookings/confirm.rb), [`Bookings::Cancel`](../../api/app/services/bookings/cancel.rb), [`WorkspaceType#my_bookings`](../../api/app/graphql/types/workspace_type.rb), [`MyBookingsPage`](../../web/apps/member/src/booking/MyBookingsPage.tsx).
- **How:** confirming refuses an expired hold (`HOLD_EXPIRED`) and a slot that has started; both changes record a message in the same transaction. Apollo `typePolicies` merge "Load more" pages.
- **Tests:** [`bookings_spec.rb`](../../api/spec/services/bookings_spec.rb), [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb) ("booking flow"), [`my-bookings.test.tsx`](../../web/tests/component/my-bookings.test.tsx), [`member.spec.ts`](../../web/e2e/member.spec.ts).
- **ADRs:** [0004](../adr/0004-graphql-with-typed-payload-errors.md), [0005](../adr/0005-transactional-outbox-for-messages.md).
- **Accessibility:** each entry's buttons name the machine, day and time; focus is kept through the two-step cancel.

## F-06 Front-desk kiosk

- **What and why:** a separate, phone-friendly app for staff at a shared desk: today's bookings as Expected and Arrived, accent-insensitive search, arrived and undo.
- **Where:** [`DeskPage`](../../web/apps/kiosk/src/DeskPage.tsx), [`daySheet.ts`](../../web/apps/kiosk/src/daySheet.ts), [`KioskRoot`](../../web/apps/kiosk/src/KioskRoot.tsx), [`Bookings::MarkArrival`](../../api/app/services/bookings/mark_arrival.rb), [`WorkspaceType#day_sheet`](../../api/app/graphql/types/workspace_type.rb).
- **How:** the day sheet (staff and managers only) uses a constant number of queries; arrivals are recorded only for today, judged by the service's injected clock. The list polls every 30 seconds and keeps the last list under a warning if a refresh fails.
- **Tests:** [`desk.test.tsx`](../../web/tests/component/desk.test.tsx), [`logic.test.ts`](../../web/tests/unit/logic.test.ts) (`splitDaySheet`), [`bookings_spec.rb`](../../api/spec/services/bookings_spec.rb) (`Bookings::MarkArrival`), [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb) ("front desk"), [`kiosk.spec.ts`](../../web/e2e/kiosk.spec.ts), [`tablet.spec.ts`](../../web/e2e/tablet.spec.ts).
- **ADRs:** [0009](../adr/0009-two-apps-in-one-web-workspace.md).
- **Accessibility:** each button names the member, machine and time, so a member booked twice has two distinct buttons; arrivals are announced and focus moves to the next person.

## F-07 Machine management

- **What and why:** managers add machines (30- or 60-minute slots), edit and retire them.
- **Where:** [`CreateMachine`](../../api/app/graphql/mutations/create_machine.rb), [`UpdateMachine`](../../api/app/graphql/mutations/update_machine.rb), [`RetireMachine`](../../api/app/graphql/mutations/retire_machine.rb), [`MachinesPage`](../../web/apps/member/src/manage/MachinesPage.tsx).
- **How:** names are unique among machines in service; retiring or changing the slot length takes the machine's record lock and is refused while bookings are upcoming, so it cannot race a hold.
- **Tests:** [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb), [`concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb), [`manage.test.tsx`](../../web/tests/component/manage.test.tsx) (`MachinesPage`), [`manager.spec.ts`](../../web/e2e/manager.spec.ts).
- **ADRs:** [0001](../adr/0001-prevent-double-booking-with-an-exclusion-constraint.md).
- **Accessibility:** retiring asks first and keeps focus on the machine's entry; field errors are tied to inputs.

## F-08 Team management and invitations

- **What and why:** managers list staff and managers, invite someone new, add an existing account with its owner's consent, change roles and remove people. Departed staff lose access at once.
- **Where:** [`AddTeamMember`](../../api/app/graphql/mutations/add_team_member.rb), [`AcceptInvitation`](../../api/app/graphql/mutations/accept_invitation.rb), [`Invitation`](../../api/app/models/invitation.rb), [`Teams::*`](../../api/app/services/teams), [`TeamPage`](../../web/apps/member/src/manage/TeamPage.tsx), [`AcceptInvitationPage`](../../web/apps/member/src/account/AcceptInvitationPage.tsx).
- **How:** a new email gets an account without a password and a single-use, 72-hour invitation link (only its digest is stored; the outbox shows the token as `hidden`). An existing account joins only with its own password. Nobody can change or remove their own membership, so a workspace keeps a manager; people with bookings can be demoted to Member but not removed.
- **Tests:** [`team_spec.rb`](../../api/spec/requests/team_spec.rb), [`concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb) (two managers demoting each other), [`manage.test.tsx`](../../web/tests/component/manage.test.tsx) (`TeamPage`), [`account.test.tsx`](../../web/tests/component/account.test.tsx), [`team.spec.ts`](../../web/e2e/team.spec.ts).
- **ADRs:** [0008](../adr/0008-invite-team-members-to-choose-their-own-password.md).
- **Accessibility:** each person's controls carry their name; after a removal focus moves to the page heading.

## F-09 Message templates

- **What and why:** managers reword the booking-confirmed and booking-cancelled messages in Liquid, with a live preview and a reset to the default, so each space speaks in its own voice.
- **Where:** [`MessageRenderer`](../../api/app/models/message_renderer.rb), [`MessageTemplate`](../../api/app/models/message_template.rb), [`SaveMessageTemplate`](../../api/app/graphql/mutations/save_message_template.rb), [`MessagesPage`](../../web/apps/member/src/manage/MessagesPage.tsx).
- **How:** strict Liquid, branching tags only, an allow-list of values, bounded input (160 / 5,000 characters), a linear-time range check and render limits; templates are validated on save and previewed by the API against sample values.
- **Tests:** [`messages_spec.rb`](../../api/spec/messages/messages_spec.rb), [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb), [`messages.test.tsx`](../../web/tests/component/messages.test.tsx), [`manager.spec.ts`](../../web/e2e/manager.spec.ts).
- **ADRs:** [0006](../adr/0006-liquid-for-workspace-editable-templates.md).
- **Accessibility:** both fields are marked `aria-invalid` and described by the list of problems while the preview finds any.

## F-10 Outbox and message delivery

- **What and why:** every confirmation, cancellation and invitation is recorded in an outbox; managers see status and last error and can retry a failure. Nothing is lost or sent for a change that rolled back.
- **Where:** [`Messages::Enqueue`](../../api/app/services/messages/enqueue.rb), [`Messages::Deliver`](../../api/app/services/messages/deliver.rb), [`NewestFirstConnection`](../../api/app/graphql/connections/newest_first_connection.rb), [`RetryMessage`](../../api/app/graphql/mutations/retry_message.rb), [`OutboxPage`](../../web/apps/member/src/manage/OutboxPage.tsx).
- **How:** the message is rendered and written in the change's transaction; a worker claims it with `FOR UPDATE SKIP LOCKED` and a lease, sends it outside any transaction, and retries after 1, 2, 4 and 8 minutes. The outbox pages by `(created_at, id)`, so a new message never shifts a later page.
- **Tests:** [`messages_spec.rb`](../../api/spec/messages/messages_spec.rb), [`concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb), [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb) (paging, retry), [`manage.test.tsx`](../../web/tests/component/manage.test.tsx) (`OutboxPage`), [`manager.spec.ts`](../../web/e2e/manager.spec.ts).
- **ADRs:** [0005](../adr/0005-transactional-outbox-for-messages.md).
- **Accessibility:** status pills pair an icon with text; each Retry button names the message.

## F-11 Usage report

- **What and why:** confirmed hours and booking counts per machine over the last 14 days, so managers see demand.
- **Where:** [`WorkspaceType#utilisation`](../../api/app/graphql/types/workspace_type.rb), [`UsagePage`](../../web/apps/member/src/manage/UsagePage.tsx).
- **How:** one grouped SQL query sums confirmed bookings that started in the window.
- **Tests:** [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb), [`tenant_isolation_spec.rb`](../../api/spec/requests/tenant_isolation_spec.rb), [`manager.spec.ts`](../../web/e2e/manager.spec.ts).
- **Accessibility:** a real table with a caption; the bars are decorative.

## F-12 Housekeeping task

- **What and why:** `bin/rails booking_kiosk:tick` lapses expired holds, deletes expired invitations and delivers messages whose retry is due (at most 100 per run). Correctness never depends on it.
- **Where:** [`booking_kiosk.rake`](../../api/lib/tasks/booking_kiosk.rake), [`Bookings::LapseExpiredHolds`](../../api/app/services/bookings/lapse_expired_holds.rb), the `scheduler` service in [`docker-compose.yml`](../../docker-compose.yml).
- **Tests:** [`booking_kiosk_tasks_spec.rb`](../../api/spec/tasks/booking_kiosk_tasks_spec.rb), [`bookings_spec.rb`](../../api/spec/services/bookings_spec.rb).
- **ADRs:** [0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md), [0005](../adr/0005-transactional-outbox-for-messages.md).

## F-13 Typed, self-documenting GraphQL API

- **What and why:** one `/graphql` endpoint with typed payload errors, non-null connections, request limits and a description on every schema element; the SDL is committed and the clients use generated types, so a schema change breaks the build, not production.
- **Where:** [`BookingKioskSchema`](../../api/app/graphql/booking_kiosk_schema.rb), [`BaseMutation`](../../api/app/graphql/mutations/base_mutation.rb), [`schema.graphql`](../../api/schema.graphql), [`codegen.ts`](../../web/codegen.ts), [`packages/api`](../../web/packages/api/src/index.ts). Reference: [api.md](api.md).
- **How:** queries are limited to 10,000 characters, 1,000 tokens, depth 10 and complexity 400; pages hold at most 50 items. Introspection is off in production. One structured log line per operation.
- **Tests:** [`schema_descriptions_spec.rb`](../../api/spec/graphql/schema_descriptions_spec.rb), [`booking_kiosk_tasks_spec.rb`](../../api/spec/tasks/booking_kiosk_tasks_spec.rb) (SDL in sync), [`auth_and_transport_spec.rb`](../../api/spec/requests/auth_and_transport_spec.rb) (limits), [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb).
- **ADRs:** [0004](../adr/0004-graphql-with-typed-payload-errors.md).

## F-14 Accessible states, themes, layouts and protective headers

- **What and why:** loading, empty and error states with Try again; a skip link; a title per page announced on navigation; light, dark and system themes applied before the first paint; layouts for phone, tablet and desktop; strict security headers on both apps and the API.
- **Where:** [`AppHeader`](../../web/packages/ui/src/components/AppHeader.tsx), [`States.tsx`](../../web/packages/ui/src/components/States.tsx), [`useDocumentTitle`](../../web/packages/ui/src/useDocumentTitle.ts), [`RouteAnnouncer`](../../web/apps/member/src/routes/RouteAnnouncer.tsx), [`useTheme`](../../web/packages/ui/src/useTheme.ts), [`theme-init.js`](../../web/public/theme-init.js), [`tokens.css`](../../web/packages/ui/src/styles/tokens.css), [`security-headers.ts`](../../web/security-headers.ts), [`application.rb`](../../api/config/application.rb). Reference: [design-tokens.md](design-tokens.md).
- **How:** "Skip to content" leads to `<main id="main">`; outcomes are announced through status regions. Below 600px the header drops secondary text; at 760px the kiosk shows one list at a time; at 860px member layouts go to one column. The sticky hold tray reserves its height as scroll padding, so focus is never hidden under it.
- **Tests:** [`design-tokens.test.ts`](../../web/tests/unit/design-tokens.test.ts), [`book.test.tsx`](../../web/tests/component/book.test.tsx), [`hold-tray.test.tsx`](../../web/tests/component/hold-tray.test.tsx), [`responsive.spec.ts`](../../web/e2e/responsive.spec.ts), [`theme.spec.ts`](../../web/e2e/theme.spec.ts), [`member.spec.ts`](../../web/e2e/member.spec.ts) (titles), [`security_headers_spec.rb`](../../api/spec/requests/security_headers_spec.rb), [`security-headers.spec.ts`](../../web/e2e/security-headers.spec.ts).
- **ADRs:** [0007](../adr/0007-same-origin-clients-cookie-sessions-and-strict-headers.md).
- **Accessibility:** see [ACCESSIBILITY.md](../../ACCESSIBILITY.md).
