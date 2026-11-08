module Mutations
  # Places a short hold on a free slot. The database exclusion constraint decides races.
  #
  # Auth: members and managers.
  # Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, SLOT_TAKEN, HOLD_LIMIT_REACHED, MISALIGNED_SLOT,
  # OUTSIDE_OPENING_HOURS, SLOT_IN_PAST, MACHINE_RETIRED, INVALID_INPUT (outside the booking horizon).
  #
  # @see docs/adr/0001-prevent-double-booking-with-an-exclusion-constraint.md
  class PlaceHold < BookingMutation
    description "Holds a slot for a few minutes. Fails with SLOT_TAKEN if anyone else holds or booked it."

    argument :machine_id, ID, "The machine to book.", required: true
    argument :starts_at, GraphQL::Types::ISO8601DateTime,
      "Start of the slot: a whole minute, aligned to the machine's slot length from opening time.", required: true

    # @param machine_id [String]
    # @param starts_at [ActiveSupport::TimeWithZone]
    # @return [Hash] the payload's `booking`, a new hold.
    def perform(machine_id:, starts_at:)
      respond_with Bookings::PlaceHold.new(tenant: tenant!, machine_id: machine_id, starts_at: starts_at).call
    end
  end
end
