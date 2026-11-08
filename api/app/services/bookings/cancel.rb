module Bookings
  # Cancels a future confirmed booking: members their own, managers any.
  # The cancellation message is recorded in the same transaction (outbox) and
  # handed to a job after commit.
  class Cancel < Transition
    # @return [Booking] the cancelled booking.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, or INVALID_STATE (not confirmed, or already started).
    def call
      scope = cancellable_scope
      message = nil
      booking = Booking.transaction do
        booking = locked_booking(scope)
        invalid_state!("Only a confirmed booking can be cancelled.") unless booking.confirmed?
        invalid_state!("A booking that has started can no longer be cancelled.") if booking.starts_at <= @now

        booking.update!(status: :cancelled, cancelled_at: @now)
        message = Messages::Enqueue.call(booking: booking, kind: "booking_cancelled")
        booking
      end
      DeliverMessageJob.perform_later(message.id)
      booking
    end

    private

    def cancellable_scope
      return @tenant.bookings if @tenant.can?(:cancel_any_booking)

      @tenant.authorize!(:book)
      @tenant.own_bookings
    end
  end
end
