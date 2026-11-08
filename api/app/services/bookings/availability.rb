# Booking state changes and slot rules. Each class does one thing and starts by
# checking the caller's role through the Tenant it is given.
module Bookings
  # The slot grid for one day: every in-service machine and the state of each slot,
  # from the viewer's point of view. Uses two queries regardless of machine count.
  class Availability
    MachineDay = Data.define(:machine, :slots)
    Slot = Data.define(:starts_at, :ends_at, :state, :booking_id)

    # @param tenant [Tenant]
    # @param date [Date] the day to show.
    # @param now [Time] injected so specs can pin the clock.
    def initialize(tenant:, date:, now: Time.current)
      @tenant = tenant
      @date = date
      @now = now
    end

    # @return [Array<MachineDay>] one entry per in-service machine, by name.
    # @raise [DomainError] FORBIDDEN, or INVALID_INPUT for a date outside the booking horizon.
    def call
      @tenant.authorize!(:view_catalogue)
      unless @tenant.workspace.bookable_dates(@now).cover?(@date)
        raise DomainError.new("INVALID_INPUT", "Choose a date from today up to #{Workspace::BOOKING_HORIZON_DAYS - 1} days ahead.")
      end

      machines = @tenant.machines.in_service.order(:name).to_a
      occupied = @tenant.bookings
        .where(machine_id: machines.map(&:id))
        .occupying(@now)
        .overlapping(@tenant.workspace.day_window(@date))
        .to_a
        .group_by(&:machine_id)

      machines.map do |machine|
        rules = SlotRules.new(workspace: @tenant.workspace, machine: machine)
        slots = rules.slots_on(@date).map { |range| slot_state(range, occupied.fetch(machine.id, [])) }
        MachineDay.new(machine: machine, slots: slots)
      end
    end

    private

    def slot_state(range, bookings)
      booking = bookings.find { |b| b.starts_at < range.end && b.ends_at > range.begin }
      state =
        if booking.nil? then range.begin <= @now ? "PAST" : "FREE"
        elsif booking.membership_id != @tenant.membership.id then "TAKEN"
        elsif booking.held? then "HELD_BY_YOU"
        else "BOOKED_BY_YOU"
        end
      Slot.new(starts_at: range.begin, ends_at: range.end, state: state,
        booking_id: booking&.membership_id == @tenant.membership.id ? booking.id : nil)
    end
  end
end
