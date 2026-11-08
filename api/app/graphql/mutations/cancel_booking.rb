module Mutations
  # Cancels a confirmed booking that has not started and queues the cancellation message.
  #
  # Auth: members and managers cancel their own bookings; managers may cancel any.
  # Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE (not confirmed, or already started).
  class CancelBooking < BookingMutation
    description "Cancels a confirmed booking that has not started. Members cancel their own; managers any in the workspace."

    argument :booking_id, ID, "The booking to cancel.", required: true

    # @param booking_id [String]
    # @return [Hash] the payload's `booking`.
    def perform(booking_id:)
      respond_with Bookings::Cancel.new(tenant: tenant!, booking_id: booking_id).call
    end
  end
end
