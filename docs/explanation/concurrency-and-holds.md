# Concurrency and holds

The hardest part of Booking Kiosk: two people must never get the same slot, holds must expire exactly, and the hold limit and machine retirement must stay correct under parallel requests. This page explains how, and which tests prove it.

## Why two people can never hold the same slot

Each booking's time is a `tstzrange` stored as `[start, end)`. Its exclusion constraint is:

```sql
EXCLUDE USING gist (machine_id WITH =, period WITH &&)
  WHERE (status IN ('held', 'confirmed'))
```

This tells Postgres that no two active bookings for the same machine may overlap. When two transactions insert overlapping holds at the same time:

1. The second one blocks on the first.
2. Once the first commits, the second fails with an exclusion violation.
3. `PlaceHold` reports that failure as `SLOT_TAKEN`.

No application-level check-then-insert is involved, so there is no window for a race. [`concurrency_spec.rb`](../../api/spec/services/concurrency_spec.rb) starts eight threads behind a latch, all aiming at one slot, and asserts that exactly one succeeds; [`member.spec.ts`](../../web/e2e/member.spec.ts) does the same with two real browsers.

Half-open ranges mean a 10:00–11:00 booking and an 11:00–12:00 booking do not overlap.

## Hold, then confirm

```mermaid
sequenceDiagram
  autonumber
  participant A as Member A (browser)
  participant B as Member B (browser)
  participant API as Rails: PlaceHold
  participant DB as Postgres
  par Both click the same free slot
    A->>API: placeHold(machine, 14:00)
    B->>API: placeHold(machine, 14:00)
  end
  API->>DB: BEGIN; lock A's membership FOR UPDATE; lock machine FOR SHARE
  API->>DB: lapse expired holds on this machine; count A's open holds
  API->>DB: INSERT booking (held, [14:00, 15:00), expires in 5 min)
  API->>DB: BEGIN (B); lock B's membership; machine FOR SHARE (shared, so no wait)
  API->>DB: INSERT booking for B, which waits for A's uncommitted booking
  API->>DB: COMMIT (A)
  DB-->>API: exclusion violation for B
  API-->>A: booking HELD, errors []
  API-->>B: errors [SLOT_TAKEN]
  A->>API: confirmBooking(id) before the hold expires
  API->>DB: BEGIN; lock booking FOR UPDATE; still open and not started?
  API->>DB: status = confirmed; INSERT outbound_messages; COMMIT
  API-->>A: booking CONFIRMED
```

## Which slots can be held

`SlotRules#slot_for!` accepts a start only if it is:

- on a date from today to 13 days ahead in the workspace's zone (`Workspace::BOOKING_HORIZON_DAYS`, also exposed as `bookingHorizonDays`);
- on a whole minute (no stray seconds or fractions, which would make a booking spill into the next slot);
- aligned to the machine's slot length from opening time;
- inside opening hours, and in the future.

## Expiring holds without a scheduler

A hold's `hold_expires_at` is the workspace's hold time from now, but never later than the slot's start. `Booking.open_holds(now)` defines "still open" once, and every check uses it ([ADR 0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md)):

1. **Reads ignore expired holds:** `Booking.occupying(now)` counts confirmed bookings plus open holds, and an expired hold reads as `LAPSED`.
2. **`PlaceHold` lapses expired holds on its machine** in its own transaction, so the exclusion constraint sees the slot as free.
3. **`booking_kiosk:tick` sweeps the rest** every minute; correctness does not depend on it.

```mermaid
sequenceDiagram
  participant T as booking_kiosk:tick (every minute)
  participant P as PlaceHold (next hold on the machine)
  participant Q as Any read (grid, myHolds, Confirm)
  participant DB as Postgres
  Note over DB: hold H expires at 14:05:00
  Q->>DB: occupying(now = 14:05:00) excludes H
  Q-->>Q: H reads as LAPSED; the slot shows FREE
  P->>DB: in its transaction: UPDATE held, expired on this machine to lapsed
  P->>DB: INSERT the new hold (constraint no longer sees H)
  T->>DB: UPDATE every remaining expired hold to lapsed
```

## The hold limit under concurrency

Members may hold at most `max_active_holds` slots at once. Counting and then inserting would race between two parallel requests from the same member. `PlaceHold` therefore takes `SELECT … FOR UPDATE` on the member's membership record first, which serialises one member's requests while leaving everyone else unaffected. A spec fires six parallel holds by one member and expects exactly the limit to succeed.

## Retiring a machine while someone holds it

Checking "no upcoming bookings" and then retiring would race with a hold being placed at the same moment. `PlaceHold` takes `FOR SHARE` on the machine's record (holds on one machine still run side by side) and checks again that it is in service; retiring a machine, or changing its slot length, takes `FOR UPDATE` on the same record before looking for upcoming bookings. Whichever comes second sees the first one's result. A parallel-threads spec races a retirement against four holds and asserts that a retired machine never keeps an active booking.

## Time zones

- **Storage:** all instants are `timestamptz`; the application runs in UTC.
- **Opening hours** are minutes after local midnight in the workspace's IANA time zone.
- **Opening and closing instants** for a date are built from local wall-clock fields (`zone.local(y, m, d, h, min)`), not "midnight plus N minutes". A spec pins the daylight-saving day, where the naive version is off by an hour.
- **API output:** times carry the workspace's offset. The clients format times with `Intl.DateTimeFormat` in the workspace zone, and treat calendar dates (`2026-03-11`) as dates, never as instants.

## Countdowns on the server's clock

`myHolds` and the workspace overview also return `serverTime`. An Apollo link records the gap to `Date.now()` as each network response arrives; answers read from the cache never pass through it, so a minutes-old cached `serverTime` cannot stretch a countdown. Every one-second tick adds that offset, and "today" in the member app moves on at midnight on the same corrected clock, so a fast device never asks for a day past the horizon. A polite live region warns once with a minute left and again at expiry; an expired hold offers "Hold again". See [ADR 0002](../adr/0002-holds-expire-lazily-and-count-down-on-the-server-clock.md).
