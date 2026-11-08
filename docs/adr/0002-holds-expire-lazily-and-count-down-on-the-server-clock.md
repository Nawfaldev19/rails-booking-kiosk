---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Holds expire lazily and count down on the server's clock

## Context and Problem Statement

A hold reserves a slot for a few minutes. Two things must agree to the second: when the API stops treating the slot as taken, and when the member's screen says time is up. A scheduler that flips statuses can run late and leave slots blocked, and a countdown on the device clock is wrong on any device whose clock is off. How should expiry be decided and shown?

## Decision Drivers

* A slot is free again the instant its hold expires, with no background process on the critical path.
* The exclusion constraint ([ADR 0001](0001-prevent-double-booking-with-an-exclusion-constraint.md)) cannot reference `now()`.
* The countdown agrees with the server whatever the device clock says, and never trusts an old reading.

## Considered Options

* Lazy expiry on every read, lapsing on write, an optional sweep, and a countdown corrected by a measured server-clock offset
* A scheduler that flips held to lapsed on time, and a countdown on the device clock
* A server-sent "seconds remaining" per hold

## Decision Outcome

Chosen option: "Lazy expiry with a server-clock countdown", because every read already knows `now`, so expiry is exact with no scheduler, and one `serverTime` field corrects every countdown.

* A hold is open while `now` is before `hold_expires_at`; `Booking.open_holds(now)` is the single definition every check uses, and `Booking.occupying(now)` counts confirmed bookings plus open holds only.
* `PlaceHold` lapses expired holds on its machine inside its own transaction before inserting; `bin/rails booking_kiosk:tick` sweeps the rest every minute. The API reports an expired hold as `LAPSED`.
* Queries that drive countdowns also return `serverTime`. An Apollo link records the offset between it and `Date.now()` at the moment each network response arrives; cached results never pass through the link, so an old reading cannot skew the clock. `useServerNow` adds that offset to every tick, and "today" in the member app moves on at midnight on the same corrected clock.

### Consequences

* Good, because expiry is exact and nothing on the critical path can run late.
* Good, because countdowns agree with the server to about a second, and a failed refresh leaves the last good offset in place.
* Bad, because a lapsed hold's stored status can lag until the next hold on that machine or the next sweep. Clients never see it, because the API maps the status as it reads it (`Booking#status_at`).
* Neutral, because network latency makes the server look a few milliseconds behind, far below the countdown's resolution.

### Confirmation

* [`models_spec.rb`](../../api/spec/models/models_spec.rb) checks the boundary at the exact instant of expiry for every check; [`booking_kiosk_tasks_spec.rb`](../../api/spec/tasks/booking_kiosk_tasks_spec.rb) checks the sweep.
* [`hold-tray.test.tsx`](../../web/tests/component/hold-tray.test.tsx) checks the countdown follows a server that is ahead of the device and that a ten-minute-old cached `serverTime` is ignored; [`server-clock.test.ts`](../../web/tests/unit/server-clock.test.ts) checks the link records only network results.

## Pros and Cons of the Options

### Lazy expiry with a server-clock countdown

* Good, because it is exact and has no moving parts on the critical path.
* Bad, because stored statuses can lag (invisible to clients).

### Scheduler and device clock

* Good, because stored statuses are always current.
* Bad, because a late scheduler blocks slots and a wrong device clock ends holds early or late.

### Seconds remaining

* Good, because it is simple.
* Bad, because the value is stale as soon as it arrives and differs per hold.

## More Information

The full hold lifecycle: [concurrency and holds](../explanation/concurrency-and-holds.md).
