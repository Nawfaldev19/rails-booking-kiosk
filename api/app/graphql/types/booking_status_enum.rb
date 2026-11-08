module Types
  # The lifecycle states of a booking (see docs/explanation/concurrency-and-holds.md).
  class BookingStatusEnum < BaseEnum
    graphql_name "BookingStatus"
    description "Where a booking is in its lifecycle: held, then confirmed or released or lapsed; confirmed, then cancelled."
    value "HELD", "Reserved for a few minutes, awaiting confirmation.", value: "held"
    value "CONFIRMED", "Booked.", value: "confirmed"
    value "RELEASED", "The member gave the hold back.", value: "released"
    value "LAPSED", "The hold expired without confirmation.", value: "lapsed"
    value "CANCELLED", "A confirmed booking that was cancelled.", value: "cancelled"
  end
end
