# Traceability

Which test files cover each feature and each security control. Example names for each feature are in the [feature catalogue](../reference/features.md); paths here are from `api/spec/` and `web/`.

## Features → test levels

| Feature | Web unit | Web component | API (RSpec) | End-to-end |
|---|---|---|---|---|
| F-01 Sign-in, sessions and passwords | — | `sign-in`, `account` | `requests/auth_and_transport`, `requests/team`, `models/models` | `team`, every spec's sign-in |
| F-02 Workspaces, roles and isolation | `logic` | `manage` | `requests/tenant_isolation`, `db/constraints`, `models/models` | `member` |
| F-03 Slot grid and day strip | `time`, `logic` | `book` | `services/bookings`, `models/models` | `member` |
| F-04 Expiring holds | `time`, `server-clock` | `hold-tray`, `book` | `services/concurrency`, `services/bookings`, `db/constraints` | `member` |
| F-05 Confirm, cancel, My bookings | — | `my-bookings`, `hold-tray` | `services/bookings`, `requests/workspace_api` | `member` |
| F-06 Front-desk kiosk | `logic` | `desk` | `services/bookings`, `requests/workspace_api` | `kiosk`, `tablet` |
| F-07 Machine management | — | `manage` | `requests/workspace_api`, `services/concurrency` | `manager` |
| F-08 Team management and invitations | — | `manage`, `account` | `requests/team`, `services/concurrency`, `db/constraints` | `team` |
| F-09 Message templates | — | `messages` | `messages/messages`, `requests/workspace_api` | `manager` |
| F-10 Outbox and delivery | — | `manage` | `messages/messages`, `services/concurrency`, `requests/workspace_api` | `manager`, `team` |
| F-11 Usage report | — | — | `requests/workspace_api`, `requests/tenant_isolation` | `manager` |
| F-12 Housekeeping task | — | — | `tasks/booking_kiosk_tasks`, `services/bookings` | — |
| F-13 Typed API | `logic` | — | `graphql/schema_descriptions`, `tasks/booking_kiosk_tasks`, `requests/auth_and_transport` | — |
| F-14 States, themes, layouts, headers | `design-tokens` | `book`, `my-bookings`, `desk`, `hold-tray`, `messages` | `requests/security_headers` | `responsive`, `theme`, `tablet`, `security-headers`, `member` |

## Security controls → tests

| Control ([threat model](../security/threat-model.md)) | ASVS | Test (example names) |
|---|---|---|
| CSRF: JSON only, origin allow-list, `SameSite=Lax` | V3, V4 | `auth_and_transport_spec.rb`: "refuses requests that are not JSON…", "refuses browser requests from origins it does not know" |
| Session fixation, idle and absolute expiry | V7 | "rotates the session on sign-in", "ends a session after two idle hours", "keeps an active session going, but never past 12 hours from sign-in" |
| Sessions end when the password changes | V7 | `team_spec.rb`: "keeps this session, and ends every other session of the account" |
| Password guessing, refunds for success, spoofed client addresses | V6 | "rate-limits repeated sign-in attempts", "does not count successful sign-ins against either budget", "ignores X-Forwarded-For by default…", "believes X-Forwarded-For only from a configured proxy" |
| No manager-chosen passwords; single-use, expiring invitations | V6, V8 | `team_spec.rb`: "refuses a password chosen by the manager…", "works only once", "stops working after 72 hours", "never shows the token to managers…" |
| Role revocation | V8 | `team_spec.rb`: "removes someone, who loses access at once"; `concurrency_spec.rb`: "never lets two managers demote each other at the same moment" |
| Cross-tenant access | V8 | `tenant_isolation_spec.rb` (8 examples); `constraints_spec.rb`: "composite tenant keys" |
| SQL-shaped input | V1, V2 | `tenant_isolation_spec.rb`: "treats SQL-shaped IDs, slugs and headers as plain values" |
| Double booking through races | V2 | `concurrency_spec.rb`; `member.spec.ts`: two browsers |
| Template injection and exhaustion | V1, V2 | `messages_spec.rb`: "offers only branching tags…", "detects ranges in time linear in the template length"; `workspace_api_spec.rb`: "refuses previews longer than a template may be…" |
| Expensive queries | V4 | `auth_and_transport_spec.rb`: query length, tokens, depth and complexity examples |
| Secrets kept out of logs | V16 | "never writes a sign-in's password or email to the log, inline or in variables" |
| Framing, sniffing, referrer, caching | V3, V4, V14 | `security_headers_spec.rb`; `security-headers.spec.ts` |
| Reliable messages | V16 | `messages_spec.rb`: backoff and permanent failure |
