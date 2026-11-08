---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Transactional outbox for messages

## Context and Problem Statement

Sending an email inside a database transaction risks emailing about a change that then rolls back. Sending it after commit risks losing it if the process dies in between. How should booking messages and team invitations be sent?

## Decision Drivers

* No message for a change that rolled back; no lost message for a change that committed.
* A slow mail server must never hold a database lock or keep a transaction open.
* Managers should see what was sent and why something failed.

## Considered Options

* A transactional outbox table, delivered after commit with claim-then-send
* Send inside the transaction
* Send after commit with no record

## Decision Outcome

Chosen option: "Transactional outbox", because the message's existence is tied to the booking change's commit, and delivery can be retried from the table.

* Write an `outbound_messages` record (already rendered) in the same transaction as the change: a booking change, or a new invitation ([ADR 0008](0008-invite-team-members-to-choose-their-own-password.md)).
* Deliver after commit through ActiveJob. A worker first claims the message in a short transaction (`FOR UPDATE SKIP LOCKED`, then a five-minute lease on `next_attempt_at`), and only then calls the mail server, with no transaction or lock open.
* Retry from `booking_kiosk:tick` once `next_attempt_at` is due, backing off 1, 2, 4 and 8 minutes.
* Mark a message `failed` after 5 attempts; a manager can queue it again.

### Consequences

* Good, because concurrent workers never send one message at the same time, and a slow mail server never holds a lock.
* Good, because the outbox is visible to managers with the last error of each failed message.
* Good, because the job queue can stay simple (the in-process `:async` adapter): durability lives in Postgres.
* Bad, because delivery is at least once, not exactly once: a crash after the mail server accepted a message but before it was recorded means it is sent again when the lease runs out. Exactly-once would need the mail provider to deduplicate on a message ID.

### Confirmation

* [`api/spec/messages/messages_spec.rb`](../../api/spec/messages/messages_spec.rb) checks delivery once when called twice, the send running outside any transaction, backoff and permanent failure after five attempts.
* [`api/spec/services/concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb) races two workers for one message and expects one email.

## Pros and Cons of the Options

### Outbox

* Good, because it is consistent with the booking change and retryable.
* Bad, because it adds a table and a housekeeping task.

### Send inside the transaction

* Good, because it is simple.
* Bad, because a rollback after sending cannot be undone, and the transaction waits on the mail server.

### Send after commit, no record

* Good, because it is simple.
* Bad, because a crash between commit and send loses the message silently.

## More Information

* Chris Richardson, "Pattern: Transactional outbox": <https://microservices.io/patterns/data/transactional-outbox.html>
* Runtime view: [explanation/architecture.md](../explanation/architecture.md#outbox-delivery).
