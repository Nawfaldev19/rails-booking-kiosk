module Types
  # What an outbox message is about: a booking change, or an invitation.
  class OutboundMessageKindEnum < BaseEnum
    graphql_name "OutboundMessageKind"
    description "What an outbox message is about."
    value "BOOKING_CONFIRMED", "A hold was confirmed.", value: "booking_confirmed"
    value "BOOKING_CANCELLED", "A confirmed booking was cancelled.", value: "booking_cancelled"
    value "INVITATION", "Someone was added to the team and invited to choose a password.", value: "invitation"
  end
end
