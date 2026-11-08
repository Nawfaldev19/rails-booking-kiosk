# Changelog

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-10-17

The first release. Each feature is described, with its code and tests, in the [feature catalogue](docs/reference/features.md).

### Added

- Rails 8.1 GraphQL API on PostgreSQL with workspaces, per-workspace roles and tenant isolation through a scoped access object and composite foreign keys (F-02).
- Member app: day strip and slot grid in the workspace's time zone (F-03), expiring holds with a countdown on the server's clock (F-04), confirm, cancel and My bookings (F-05).
- Double-booking prevention with a Postgres exclusion constraint, proven by a parallel-threads spec and a two-browser end-to-end test (F-04).
- Front-desk kiosk app with search and arrival marking (F-06).
- Manager pages: machines (F-07), team with invitations, role changes and removal (F-08), Liquid message templates with a live preview (F-09), the outbox with retry (F-10) and a usage report (F-11).
- Account page to change one's password, and an invitation page where a new team member chooses theirs (F-01, F-08).
- Transactional outbox with claim-then-send delivery and backoff, plus the `booking_kiosk:tick` housekeeping task (F-10, F-12).
- Typed GraphQL API with a description on every schema element, a committed SDL and generated client types (F-13).
- Accessible loading, empty and error states, per-page titles, light and dark themes, and layouts for phone, tablet and desktop (F-14).
- Docker Compose, a Makefile gate, GitHub Actions CI, Dependabot, dependency review and OpenSSF Scorecard.

### Security

- Cookie sessions that expire after two idle hours and at most 12 hours after sign-in, and end on every other device when the password changes.
- Failed password attempts limited per account and per client address; `X-Forwarded-For` is believed only from configured proxies.
- New team members choose their own password through a single-use, expiring invitation link; managers never set or see one.
- Template checks run in linear time on bounded input; query documents are limited in length, tokens, depth and complexity.
- Passwords, emails and GraphQL variables are kept out of the request log.
- Strict response headers on the API and both apps, including a Content Security Policy without `'unsafe-inline'`. The full list is in [ADR 0007](docs/adr/0007-same-origin-clients-cookie-sessions-and-strict-headers.md).
