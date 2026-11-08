---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Prevent double booking with an exclusion constraint

## Context and Problem Statement

The classic bug in reservation systems is "check availability, then insert". Two requests both see the slot as free and both insert. How does Booking Kiosk guarantee that two active bookings of one machine never overlap, whatever code path writes them?

## Decision Drivers

* The guarantee must hold under any number of parallel requests.
* It must hold for every writer: the API, consoles, scripts and future services.
* It must be provable by a test, not by reasoning about locks.

## Considered Options

* A Postgres exclusion constraint on a `tstzrange`
* Application-level check-then-insert under an advisory lock or mutex
* `SERIALIZABLE` transactions with retry

## Decision Outcome

Chosen option: "A Postgres exclusion constraint", because the database itself refuses overlapping active bookings from every writer, with no window between a check and an insert.

* Each booking's time is a `tstzrange` `[start, end)`.
* `EXCLUDE USING gist (machine_id WITH =, period WITH &&) WHERE (status IN ('held', 'confirmed'))`, named `bookings_no_overlap`.
* `Bookings::PlaceHold` inserts optimistically and translates `ActiveRecord::ExclusionViolation` into the typed error `SLOT_TAKEN`.

### Consequences

* Good, because the guarantee covers every code path and documents the rule in the schema.
* Good, because back-to-back slots (10:00–11:00 and 11:00–12:00) do not overlap, thanks to half-open ranges.
* Bad, because it needs the `btree_gist` extension (shipped with Postgres).
* Bad, because the partial `WHERE` cannot use `now()` (index predicates must be immutable), so expired holds are lapsed before inserting ([ADR 0002](0002-holds-expire-lazily-and-count-down-on-the-server-clock.md)).

### Confirmation

* [`api/spec/db/constraints_spec.rb`](../../api/spec/db/constraints_spec.rb) inserts overlapping bookings with raw SQL and expects the constraint to fire.
* [`api/spec/services/concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb) races eight threads for one slot and expects exactly one hold.
* [`web/e2e/member.spec.ts`](../../web/e2e/member.spec.ts) has two browsers click one free slot at the same moment.

## Pros and Cons of the Options

### Exclusion constraint

* Good, because it is enforced by the database for all writers.
* Neutral, because a losing transaction waits for the winner to commit, then fails fast.

### Check-then-insert under a lock

* Good, because it needs no extension.
* Bad, because any code path that forgets the lock reintroduces the race, and it is hard to prove.

### Serialisable transactions

* Good, because it is general.
* Bad, because every caller needs retry logic, and serialisation failures are harder to map to a clear `SLOT_TAKEN`.

## More Information

* PostgreSQL, "Range Types: Constraints on Ranges": <https://www.postgresql.org/docs/current/rangetypes.html>
* Design notes: [concurrency and holds](../explanation/concurrency-and-holds.md).
