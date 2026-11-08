module Bookings
  # Marks holds whose time ran out as lapsed. Correctness never depends on this
  # running (expired holds are ignored by every query), but it keeps statuses
  # truthful and frees the exclusion constraint for new holds.
  class LapseExpiredHolds
    # @param scope [ActiveRecord::Relation<Booking>] which bookings to sweep.
    # @param now [Time]
    # @return [Integer] how many holds were lapsed.
    def self.call(scope: Booking.all, now: Time.current)
      scope.expired_holds(now).update_all(status: "lapsed", updated_at: now)
    end
  end
end
