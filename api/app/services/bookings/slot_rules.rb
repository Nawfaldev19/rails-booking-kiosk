module Bookings
  # Checks that a requested start time is a real, bookable slot for a machine.
  class SlotRules
    # @param workspace [Workspace]
    # @param machine [Machine]
    def initialize(workspace:, machine:)
      @workspace = workspace
      @machine = machine
    end

    # Returns the slot as a Time range, or raises DomainError.
    #
    # @param starts_at [Time]
    # @param now [Time]
    # @return [Range<ActiveSupport::TimeWithZone>] half-open `[start, start + slot length)`.
    # @raise [DomainError] INVALID_INPUT (outside the horizon), MISALIGNED_SLOT,
    #   OUTSIDE_OPENING_HOURS or SLOT_IN_PAST.
    def slot_for!(starts_at, now:)
      starts_at = starts_at.in_time_zone(@workspace.zone)
      slot = starts_at...(starts_at + @machine.slot_minutes.minutes)
      window = @workspace.opening_window(starts_at.to_date)

      unless @workspace.bookable_dates(now).cover?(starts_at.to_date)
        raise DomainError.new("INVALID_INPUT", "Choose a date from today up to #{Workspace::BOOKING_HORIZON_DAYS - 1} days ahead.")
      end
      # Whole minutes only: a start of 14:00:00.5 would make the booking spill into the next slot.
      unless starts_at.sec.zero? && starts_at.usec.zero? && aligned?(starts_at, window.begin)
        raise DomainError.new("MISALIGNED_SLOT", "Slots for this machine start every #{@machine.slot_minutes} minutes from opening time.")
      end
      unless window.cover?(slot.begin) && slot.end <= window.end
        raise DomainError.new("OUTSIDE_OPENING_HOURS", "That time is outside opening hours.")
      end
      raise DomainError.new("SLOT_IN_PAST", "That slot has already started.") if slot.begin <= now

      slot
    end

    # Every slot of the machine on a date, in order.
    #
    # @param date [Date]
    # @return [Array<Range<ActiveSupport::TimeWithZone>>] slots that fit wholly inside opening hours.
    def slots_on(date)
      window = @workspace.opening_window(date)
      step = @machine.slot_minutes.minutes
      starts = []
      cursor = window.begin
      while cursor + step <= window.end
        starts << (cursor...(cursor + step))
        cursor += step
      end
      starts
    end

    private

    def aligned?(starts_at, opening)
      ((starts_at - opening) / 60).to_i % @machine.slot_minutes == 0
    end
  end
end
