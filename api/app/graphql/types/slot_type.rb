module Types
  # One slot of one machine on the availability grid.
  class SlotType < BaseObject
    graphql_name "Slot"
    description "One slot of one machine on the availability grid."

    field :starts_at, GraphQL::Types::ISO8601DateTime, "Start of the slot (inclusive).", null: false
    field :ends_at, GraphQL::Types::ISO8601DateTime, "End of the slot (exclusive).", null: false
    field :state, SlotStateEnum, "The slot's state for the viewer.", null: false
    field :booking_id, ID, "Set when the slot is the viewer's own hold or booking.", null: true
  end
end
