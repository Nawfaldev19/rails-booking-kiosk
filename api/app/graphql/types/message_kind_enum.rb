module Types
  # The kinds of message Booking Kiosk sends; each has a built-in default template.
  class MessageKindEnum < BaseEnum
    graphql_name "MessageKind"
    description "Which booking change a message is about."
    value "BOOKING_CONFIRMED", "Sent when a hold is confirmed.", value: "booking_confirmed"
    value "BOOKING_CANCELLED", "Sent when a confirmed booking is cancelled.", value: "booking_cancelled"
  end
end
