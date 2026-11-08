# GraphQL API reference

Booking Kiosk has one endpoint, `POST /graphql`, served by Rails and reached by the apps through their own origin (the Vite proxy in development). The schema is self-documenting: every type, field, argument and enum value has a description, enforced by [`schema_descriptions_spec.rb`](../../api/spec/graphql/schema_descriptions_spec.rb).

## Exploring the schema

- **Read the SDL:** [`api/schema.graphql`](../../api/schema.graphql) is generated from the code (`cd api && bin/rails booking_kiosk:schema:dump`) and committed. CI fails if it is stale, and the web code generator reads it, so the client types always match.
- **Introspection:** answered in development and test (any GraphQL client can point at `http://localhost:3300/graphql`); switched off in production, where the committed SDL is the reference.

```bash
curl -s http://localhost:3300/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ serverTime }"}'
```

## Transport rules

- Requests must be `Content-Type: application/json`; anything else gets **415**. Requests with an `Origin` header that is not in `ALLOWED_ORIGINS` get **403**. Malformed `variables` get **400**.
- Authentication is the session cookie set by `signIn`. Mutations that act inside a workspace read its slug from the `X-Booking-Kiosk-Workspace` header; queries name it with `workspace(slug:)`.
- Responses carry `Cache-Control: no-store` and the headers in [ADR 0007](../adr/0007-same-origin-clients-cookie-sessions-and-strict-headers.md).
- Limits: a query document of at most 10,000 characters (**400** otherwise) and 1,000 tokens, depth 10, complexity 400, page size 20 by default and 50 at most.

## Error model

- **Mutations** never throw expected failures. Every payload has `errors: [UserError!]!` with `code` (an `ErrorCode`), `message` (a sentence to show) and `field` (the input concerned, when there is one). An empty list means success.
- **Queries** report domain failures as top-level GraphQL errors with `extensions.code`, for example `FORBIDDEN` for a role that may not read a field, or `INVALID_INPUT` for a date outside the booking horizon.
- **Not a member** of a workspace: `workspace(slug:)` returns null (the same as an unknown slug). A mutation from a signed-out caller gets `UNAUTHENTICATED`; a signed-in caller who is not a member of the header's workspace gets `FORBIDDEN`. A record from another workspace is `NOT_FOUND`.

The codes and their meanings are the `ErrorCode` enum in [`schema.graphql`](../../api/schema.graphql) (from [`error_code_enum.rb`](../../api/app/graphql/types/error_code_enum.rb)).

## Queries

| Field | Purpose | Who may read |
|---|---|---|
| `viewer` | The signed-in person and their memberships; null when signed out. | anyone |
| `serverTime` | The server's clock, for countdowns. | anyone |
| `workspace(slug:)` | A workspace the viewer belongs to, or null. | members of it |
| `workspace.machines(includeRetired:)` | Machines by name. | every role |
| `workspace.availability(date:)` | The slot grid for one day. | every role |
| `workspace.myBookings(upcoming:)` | The viewer's bookings (connection). | members, managers |
| `workspace.myHolds` | The viewer's open holds. | members, managers |
| `workspace.daySheet` | Today's confirmed bookings. | staff, managers |
| `workspace.messageTemplates` | Templates per message kind. | managers |
| `workspace.messagePreview(kind:, subject:, body:)` | Renders a draft template. | managers |
| `workspace.outbox` | Recorded messages, newest first (keyset connection); invitation tokens read `hidden`. | managers |
| `workspace.utilisation` | Confirmed hours per machine, last 14 days. | managers |
| `workspace.team` | Staff and managers, with `invitationPending` and `isViewer`. | managers |

## Mutations

| Mutation | Purpose | Who may call |
|---|---|---|
| `signIn(email:, password:)` | Starts a session; rate-limited. | anyone |
| `signOut` | Ends the session. | anyone |
| `acceptInvitation(token:, password:)` | Chooses an invited account's password and signs in; one use, 72 hours. | anyone with the link |
| `changePassword(currentPassword:, newPassword:)` | Changes one's own password; other sessions end. | signed in |
| `placeHold(machineId:, startsAt:)` | Holds a free slot. | members, managers |
| `confirmBooking(bookingId:)` | Confirms the viewer's open hold. | members, managers |
| `releaseHold(bookingId:)` | Gives the viewer's hold back. | members, managers |
| `cancelBooking(bookingId:)` | Cancels a booking that has not started (own, or any for managers). | members, managers |
| `markArrival(bookingId:, arrived:)` | Records or undoes an arrival today. | staff, managers |
| `createMachine`, `updateMachine`, `retireMachine` | Manage machines. | managers |
| `addTeamMember(name:, email:, password:, role:)` | Invites a new email, or adds an existing account with its own password ([ADR 0008](../adr/0008-invite-team-members-to-choose-their-own-password.md)). | managers |
| `changeTeamRole(membershipId:, role:)`, `removeTeamMember(membershipId:)` | Change someone else's role or remove them; never one's own. | managers |
| `saveMessageTemplate`, `resetMessageTemplate` | Customise or reset a message. | managers |
| `retryMessage(messageId:)` | Queues a failed message again. | managers |

Roles are defined once in [`Policy::RULES`](../../api/app/models/policy.rb).

## Pagination

`myBookings` and `outbox` are Relay connections with `first`/`after` and `pageInfo { hasNextPage endCursor }`; edges and nodes are non-null and cursors are opaque. `outbox` pages by key: its cursor names an entry's `(created_at, id)` ([`NewestFirstConnection`](../../api/app/graphql/connections/newest_first_connection.rb)), so a message recorded between pages never repeats or shifts an entry, and a cursor the server did not issue is `INVALID_INPUT`. `myBookings` uses graphql-ruby's offset-based connection; a member's own list changes only through their own actions. The clients merge "Load more" pages with Apollo `typePolicies` in [`client.ts`](../../web/packages/api/src/client.ts).

## Adding an operation

See [how-to/add-a-graphql-mutation.md](../how-to/add-a-graphql-mutation.md).
