module Bookings
  # Turns the member's own open hold into a booking and queues the confirmation message.
  class Confirm < Transition
    # @return [Booking] the confirmed booking.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, HOLD_EXPIRED, INVALID_STATE or SLOT_IN_PAST.
    def call
      @tenant.authorize!(:book)
      message = nil
      booking = Booking.transaction do
        booking = locked_booking(@tenant.own_bookings)
        # An expired hold reads as lapsed whether or not the sweeper has marked it yet.
        raise DomainError.new("HOLD_EXPIRED", "Your hold ran out. Please choose the slot again.") if booking.status_at(@now) == "lapsed"
        invalid_state!("Only a held slot can be confirmed.") unless booking.held?
        raise DomainError.new("SLOT_IN_PAST", "That slot has already started.") if booking.starts_at <= @now

        booking.update!(status: :confirmed, confirmed_at: @now, hold_expires_at: nil)
        message = Messages::Enqueue.call(booking: booking, kind: "booking_confirmed")
        booking
      end
      DeliverMessageJob.perform_later(message.id)
      booking
    end
  end
end
