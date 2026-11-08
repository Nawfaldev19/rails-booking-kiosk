module Mutations
  # Gives back the viewer's own hold so others can take the slot.
  #
  # Auth: members and managers, own holds only. Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE.
  class ReleaseHold < BookingMutation
    description "Gives the viewer's own hold back before it expires."

    argument :booking_id, ID, "The hold to release.", required: true

    # @param booking_id [String]
    # @return [Hash] the payload's `booking`, now RELEASED.
    def perform(booking_id:)
      respond_with Bookings::Release.new(tenant: tenant!, booking_id: booking_id).call
    end
  end
end
