module Mutations
  # Front-desk arrival marking for today's bookings.
  #
  # Auth: staff and managers. Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE.
  class MarkArrival < BookingMutation
    description "Records that the member has arrived for today's booking, or undoes it. Staff and managers."

    argument :booking_id, ID, "One of today's confirmed bookings.", required: true
    argument :arrived, Boolean, "True to record the arrival, false to undo it.", required: true

    # @param booking_id [String]
    # @param arrived [Boolean]
    # @return [Hash] the payload's `booking`.
    def perform(booking_id:, arrived:)
      respond_with Bookings::MarkArrival.new(tenant: tenant!, booking_id: booking_id, arrived: arrived).call
    end
  end
end
