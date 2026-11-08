---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Tenant isolation through a scoped access object plus composite keys

## Context and Problem Statement

Several makerspaces share one database and schema. Shared-schema multi-tenancy fails when one query forgets its `WHERE workspace_id = …`. How does Booking Kiosk make cross-workspace reads and writes impossible in practice and visible in review?

## Decision Drivers

* One forgotten filter must not leak another workspace's data.
* Isolation should be visible in code review.
* The database should refuse cross-workspace references independently of the application.

## Considered Options

* (a) A default scope on every model
* (b) Postgres policy-based security (per-workspace security policies)
* (c) An explicit scoped access object (`Tenant`) plus composite foreign keys

## Decision Outcome

Chosen option: "(c)", because it makes the access path explicit in code and adds a database-level guarantee for references.

* `Tenant` is built only for an actual membership, and it only hands out relations already filtered to that workspace.
* GraphQL resolvers and services receive a `Tenant`, never a bare model class.
* Composite foreign keys such as `(machine_id, workspace_id) → machines(id, workspace_id)` make cross-workspace references impossible in the database.
* `workspace(slug:)` puts its tenant in scoped GraphQL context, so nested fields cannot read a different workspace than the one asked for.

### Consequences

* Good, because a resolver that uses a model class directly stands out in review.
* Good, because the database independently enforces referential isolation.
* Bad, because reads are protected by convention plus review, not by the database; option (b) would add that barrier and is listed as the next hardening step.

### Confirmation

* [`api/spec/requests/tenant_isolation_spec.rb`](../../api/spec/requests/tenant_isolation_spec.rb) attacks with foreign IDs and mismatched header and slug.
* [`api/spec/db/constraints_spec.rb`](../../api/spec/db/constraints_spec.rb) shows composite keys rejecting cross-workspace references, even through `insert_all` and `update_all`.

## Pros and Cons of the Options

### (a) Default scopes

* Good, because filtering is automatic.
* Bad, because implicit scopes surprise people and break in background jobs and consoles.

### (b) Policy-based security in Postgres

* Good, because the database enforces reads too.
* Bad, because it needs a per-request database setting and more operational care; deferred, not rejected.

### (c) Scoped access object plus composite keys

* Good, because it is explicit and testable.
* Bad, because it depends on discipline for reads.

## More Information

* Data model and keys: [reference/data-model.md](../reference/data-model.md).
* Threats and mitigations: [security/threat-model.md](../security/threat-model.md).
