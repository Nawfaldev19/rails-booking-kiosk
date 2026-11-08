module Bookings
  # Shared plumbing for changing one booking's state under a record lock.
  class Transition
    # @param tenant [Tenant]
    # @param booking_id [String]
    # @param now [Time] injected so specs can pin the clock.
    def initialize(tenant:, booking_id:, now: Time.current)
      @tenant = tenant
      @booking_id = booking_id
      @now = now
    end

    private

    # @param scope [ActiveRecord::Relation<Booking>] already limited to what the caller may touch.
    # @return [Booking] locked FOR UPDATE until the transaction ends.
    # @raise [DomainError] NOT_FOUND.
    def locked_booking(scope)
      scope.lock.find_by(id: @booking_id) or
        raise DomainError.new("NOT_FOUND", "That booking does not exist in this workspace.")
    end

    def invalid_state!(message)
      raise DomainError.new("INVALID_STATE", message)
    end
  end
end
