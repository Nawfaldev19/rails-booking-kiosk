module Mutations
  # Confirms the viewer's own open hold and queues the confirmation message.
  #
  # Auth: members and managers, own holds only.
  # Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, HOLD_EXPIRED, SLOT_IN_PAST, INVALID_STATE.
  class ConfirmBooking < BookingMutation
    description "Turns the viewer's own open hold into a booking. Fails with HOLD_EXPIRED once the hold has run out."

    argument :booking_id, ID, "The hold to confirm.", required: true

    # @param booking_id [String]
    # @return [Hash] the payload's `booking`.
    def perform(booking_id:)
      respond_with Bookings::Confirm.new(tenant: tenant!, booking_id: booking_id).call
    end
  end
end
