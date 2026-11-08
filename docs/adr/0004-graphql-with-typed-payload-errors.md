---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# GraphQL with typed payload errors

## Context and Problem Statement

Booking has many expected failures: taken, expired, outside hours, limit reached. Raising them as top-level GraphQL errors makes clients parse strings. How should the API report expected failures?

## Decision Drivers

* Clients branch on a stable code, not on message text.
* Generated client types should not carry needless `null` checks.
* Schema changes must be reviewable.

## Considered Options

* Typed `errors: [UserError!]!` in every mutation payload, with an `ErrorCode` enum
* Top-level GraphQL errors with `extensions.code` for everything
* Union result types per mutation (`PlaceHoldSuccess | SlotTaken | …`)

## Decision Outcome

Chosen option: "Typed payload errors", because it keeps every mutation's shape the same and lets clients switch on one enum.

* Each mutation returns `{ result, errors: [UserError!]! }`, where `code` is an `ErrorCode` value and `field` names the input concerned.
* Query-level domain errors carry `extensions.code`.
* Payloads, edges and nodes are non-null.
* Every schema element has a description, so the SDL is self-documenting.

### Consequences

* Good, because clients branch on `SLOT_TAKEN` rather than message text, and generated TypeScript types stay strict.
* Good, because a schema change shows up as a reviewed diff of `api/schema.graphql`.
* Bad, because queries and mutations report errors in two different places (query errors are top-level).

### Confirmation

* [`api/spec/tasks/booking_kiosk_tasks_spec.rb`](../../api/spec/tasks/booking_kiosk_tasks_spec.rb) fails when `schema.graphql` is stale; CI also regenerates the client types and fails on a difference.
* [`api/spec/graphql/schema_descriptions_spec.rb`](../../api/spec/graphql/schema_descriptions_spec.rb) fails when any type, field, argument or enum value lacks a description.
* Request specs assert typed error codes for each failure path.

## Pros and Cons of the Options

### Typed payload errors

* Good, because one uniform shape and one enum.
* Bad, because a client can forget to read `errors`; the shared `firstUserError` helper makes it the default path.

### Top-level errors only

* Good, because it is the GraphQL default.
* Bad, because partial data and error parsing complicate clients.

### Union result types

* Good, because each outcome is its own type.
* Bad, because every mutation needs several types and clients need fragments for each.

## More Information

API reference: [reference/api.md](../reference/api.md).
