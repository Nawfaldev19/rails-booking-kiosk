module Bookings
  # Gives back the member's own hold before it expires.
  class Release < Transition
    # @return [Booking] the released hold.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, or INVALID_STATE (not a hold).
    def call
      @tenant.authorize!(:book)
      Booking.transaction do
        booking = locked_booking(@tenant.own_bookings)
        invalid_state!("Only a held slot can be released.") unless booking.held?

        booking.update!(status: :released, hold_expires_at: nil)
        booking
      end
    end
  end
end
