module Bookings
  # Reserves a slot for a few minutes while the member confirms.
  #
  # The database decides who wins a race: the `bookings_no_overlap` exclusion
  # constraint rejects a second active booking for the same machine and time,
  # however many requests arrive at once.
  #
  # @see docs/explanation/concurrency-and-holds.md
  class PlaceHold
    # @param tenant [Tenant]
    # @param machine_id [String]
    # @param starts_at [Time] the requested slot start.
    # @param now [Time] injected so specs can pin the clock.
    def initialize(tenant:, machine_id:, starts_at:, now: Time.current)
      @tenant = tenant
      @machine_id = machine_id
      @starts_at = starts_at
      @now = now
    end

    # @return [Booking] the new hold.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, MACHINE_RETIRED, HOLD_LIMIT_REACHED, SLOT_TAKEN, or a
    #   slot-rule error from {SlotRules#slot_for!}.
    def call
      @tenant.authorize!(:book)
      machine = @tenant.machines.find_by(id: @machine_id) or
        raise DomainError.new("NOT_FOUND", "That machine does not exist in this workspace.")
      ensure_in_service!(machine)

      workspace = @tenant.workspace
      slot = SlotRules.new(workspace: workspace, machine: machine).slot_for!(@starts_at, now: @now)

      Booking.transaction do
        # Serialise this member's requests so the hold limit cannot be exceeded by parallel calls.
        @tenant.membership.lock!
        # A shared lock lets holds on one machine run side by side, but waits for a
        # manager who is retiring the machine or changing its slot length (they take
        # FOR UPDATE), so a hold can never land on a machine that has just been retired.
        machine.lock!("FOR SHARE")
        ensure_in_service!(machine)
        LapseExpiredHolds.call(scope: machine.bookings, now: @now)
        enforce_hold_limit!(workspace)
        @tenant.bookings.create!(
          machine: machine,
          membership: @tenant.membership,
          status: :held,
          period: slot,
          # A hold never outlives the start of its slot, so it cannot be confirmed once the slot has begun.
          hold_expires_at: [ @now + workspace.hold_minutes.minutes, slot.begin ].min
        )
      end
    rescue ActiveRecord::ExclusionViolation
      raise DomainError.new("SLOT_TAKEN", "That slot is no longer free.")
    end

    private

    def ensure_in_service!(machine)
      raise DomainError.new("MACHINE_RETIRED", "That machine is no longer available.") if machine.retired?
    end

    def enforce_hold_limit!(workspace)
      return if @tenant.own_bookings.open_holds(@now).count < workspace.max_active_holds

      raise DomainError.new("HOLD_LIMIT_REACHED",
        "You can hold at most #{workspace.max_active_holds} slots at once. Confirm or release one first.")
    end
  end
end
