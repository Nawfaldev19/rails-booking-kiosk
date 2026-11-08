module Types
  # A slot's state from the viewer's point of view.
  class SlotStateEnum < BaseEnum
    graphql_name "SlotState"
    description "A slot's state from the viewer's point of view."
    value "FREE", "Available to hold."
    value "TAKEN", "Held or booked by someone else."
    value "HELD_BY_YOU", "Your open hold."
    value "BOOKED_BY_YOU", "Your confirmed booking."
    value "PAST", "Already started."
  end
end
