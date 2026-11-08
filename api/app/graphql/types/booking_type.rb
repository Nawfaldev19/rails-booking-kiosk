module Types
  # A hold or booking of one machine for one slot.
  class BookingType < BaseObject
    graphql_name "Booking"
    description "A hold or booking of one machine for one slot."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :status, BookingStatusEnum, "A hold past its expiry reads as LAPSED, even before the sweeper runs.", null: false
    field :starts_at, GraphQL::Types::ISO8601DateTime, "Start of the slot (inclusive).", null: false
    field :ends_at, GraphQL::Types::ISO8601DateTime, "End of the slot (exclusive), so back-to-back slots never overlap.", null: false
    field :hold_expires_at, GraphQL::Types::ISO8601DateTime,
      "When an open hold runs out; never later than the slot's start. Null once confirmed or released.", null: true
    field :confirmed_at, GraphQL::Types::ISO8601DateTime, "When the hold was confirmed.", null: true
    field :arrived_at, GraphQL::Types::ISO8601DateTime, "When the front desk marked the member as arrived.", null: true
    field :cancelled_at, GraphQL::Types::ISO8601DateTime, "When the booking was cancelled.", null: true
    field :machine, MachineType, "The machine booked.", null: false
    field :member, MemberType, "Who the booking belongs to (name only).", null: false, method: :membership

    # @return [String] the stored status, or "lapsed" for a hold past its expiry.
    def status = object.status_at(Time.current)
  end
end
