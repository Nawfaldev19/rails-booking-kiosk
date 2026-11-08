module Bookings
  # Front-desk staff record (or undo) a member's arrival for today's booking.
  class MarkArrival < Transition
    # @param arrived [Boolean] true records the arrival (keeping the first time), false clears it.
    # @param rest [Hash] tenant, booking_id and now, as for {Transition#initialize}.
    def initialize(arrived:, **rest)
      super(**rest)
      @arrived = arrived
    end

    # @return [Booking]
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, or INVALID_STATE (not confirmed, or not today).
    def call
      @tenant.authorize!(:mark_arrival)
      Booking.transaction do
        booking = locked_booking(@tenant.bookings)
        invalid_state!("Only confirmed bookings can be marked.") unless booking.confirmed?
        workspace = @tenant.workspace
        today = workspace.day_window(@now.in_time_zone(workspace.zone).to_date)
        invalid_state!("Arrivals can only be recorded for today's bookings.") unless today.cover?(booking.starts_at)

        booking.update!(arrived_at: @arrived ? (booking.arrived_at || @now) : nil)
        booking
      end
    end
  end
end
