# Scope

## Goal

Community makerspaces share one hosted booking service. Members book machines in fixed slots without ever colliding, front-desk staff see who is due today, and managers run their own space without seeing anyone else's.

## In scope

- Workspaces, people with a role per workspace (member, staff, manager), cookie sessions and password changes.
- A slot grid for today plus 13 days in the workspace's time zone; holds with a countdown; confirm, release and cancel; My bookings.
- The front desk: today's list, expected and arrived, search, arrival and undo, on a phone.
- Managers: machines, team (invitations, role changes, removal), message templates with a preview, the outbox with retry, 14-day usage.
- Messaging through a transactional outbox, with periodic housekeeping.

Each feature is described in the [feature catalogue](../reference/features.md).

## Non-goals

Payments, self sign-up, password reset by email, recurring bookings, waitlists, account lockout and multi-factor authentication.

## Constraints

- Permissively licensed dependencies only.
- Seeded people and places are fictional; every email uses `example.com`.
- Runs locally with one command (Docker Compose) or with Ruby, Node and Postgres.

## Definition of done

- `make verify` passes: RuboCop, RSpec at 90% line coverage or more, ESLint with the TSDoc rule, Knip, Prettier, `tsc`, Vitest, both builds and Playwright.
- Every feature in the catalogue has tests at the levels listed in [traceability.md](../testing/traceability.md).
