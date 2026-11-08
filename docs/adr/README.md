# Architecture decision records

One file per decision, in [MADR 4.0.0](https://adr.github.io/madr/) format. To add one, copy the headings of an existing record, give it the next number and add it here.

| ADR | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-prevent-double-booking-with-an-exclusion-constraint.md) | Prevent double booking with an exclusion constraint | accepted | 2026-10-17 |
| [0002](0002-holds-expire-lazily-and-count-down-on-the-server-clock.md) | Holds expire lazily and count down on the server's clock | accepted | 2026-10-17 |
| [0003](0003-tenant-isolation-through-a-scoped-access-object-and-composite-keys.md) | Tenant isolation through a scoped access object plus composite keys | accepted | 2026-10-17 |
| [0004](0004-graphql-with-typed-payload-errors.md) | GraphQL with typed payload errors | accepted | 2026-10-17 |
| [0005](0005-transactional-outbox-for-messages.md) | Transactional outbox for messages | accepted | 2026-10-17 |
| [0006](0006-liquid-for-workspace-editable-templates.md) | Liquid for workspace-editable templates | accepted | 2026-10-17 |
| [0007](0007-same-origin-clients-cookie-sessions-and-strict-headers.md) | Same-origin clients, cookie sessions and strict response headers | accepted | 2026-10-17 |
| [0008](0008-invite-team-members-to-choose-their-own-password.md) | Invite team members to choose their own password | accepted | 2026-10-17 |
| [0009](0009-two-apps-in-one-web-workspace.md) | Two apps, one npm workspace for the web | accepted | 2026-10-17 |
| [0010](0010-test-against-a-real-database-and-browser.md) | Test against a real database and a real browser | accepted | 2026-10-17 |

Documenting every export and schema element is a convention, not a decision record: it is enforced by lint and a spec (see [CONTRIBUTING.md](../../CONTRIBUTING.md#code-style)).
