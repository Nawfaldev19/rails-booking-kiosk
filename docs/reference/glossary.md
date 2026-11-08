# Glossary

| Term | Meaning | In code |
|---|---|---|
| Workspace | One makerspace; the tenant boundary. | `Workspace`, `/w/:slug` |
| Membership | A person's role in one workspace. | `Membership` |
| Role | `member` (books), `staff` (runs the front desk), `manager` (both, and manages the space). | `Membership#role`, `Role` enum |
| Tenant | The scoped access object for one membership; the only way resolvers reach workspace data. | `Tenant` |
| Capability | A named permission in the role table, such as `book` or `mark_arrival`. | `Policy::RULES` |
| Machine | A bookable piece of equipment with 30- or 60-minute slots. | `Machine` |
| Slot | One fixed time window on one machine, aligned to opening time. | `Bookings::SlotRules`, `Slot` type |
| Booking horizon | Today plus the next 13 days. | `Workspace::BOOKING_HORIZON_DAYS` |
| Hold | A booking in status `held`, reserving a slot for a few minutes. | `Booking` (`held`) |
| Open hold | A hold whose expiry is still in the future. | `Booking.open_holds` |
| Occupying | Confirmed bookings plus open holds: what blocks a slot. | `Booking.occupying` |
| Day sheet | Today's confirmed bookings, for the front desk. | `daySheet` |
| Arrival | The front desk marking that a member turned up for today's booking. | `arrived_at`, `markArrival` |
| Outbox | Messages recorded with the booking change that caused them, delivered afterwards. | `OutboundMessage`, `Messages::*` |
| Lease | A short claim on an outbox message (`next_attempt_at` moved five minutes ahead) while a worker sends it. | `OutboundMessage::SEND_LEASE` |
| Template | A workspace's Liquid wording for one message kind. | `MessageTemplate`, `MessageRenderer` |
| Fallback | The built-in default wording, used when a saved template fails to render. | `used_fallback_template` |
| Tick | The periodic housekeeping task. | `booking_kiosk:tick` |
| Invitation | A single-use, 72-hour link that lets someone added to a team choose their own password. | `Invitation`, `acceptInvitation` |
| Invited account | An account without a password yet; it cannot sign in. | `User#invited?` |
| Trusted proxy | A proxy whose `X-Forwarded-For` header is believed for the per-address limit. | `TRUSTED_PROXIES`, `ClientAddress` |
| Server-clock offset | How far the server's clock is from the device's, measured from live responses. | `serverClockLink`, `useServerNow` |
| Exclusion constraint | A Postgres constraint that refuses two active bookings of one machine with overlapping times; see [data-model.md](data-model.md). | `bookings_no_overlap` |
| Typed error | An expected failure returned in a mutation payload with a stable code. | `UserError`, `ErrorCode`, `DomainError` |
