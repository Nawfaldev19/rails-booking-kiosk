module Mutations
  # Takes a machine out of service once nothing upcoming is booked on it.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE (upcoming bookings).
  class RetireMachine < MachineMutation
    description "Takes a machine out of service. Its history is kept. Refused while it has upcoming bookings. Managers only."

    argument :machine_id, ID, "The machine to retire.", required: true

    # @param machine_id [String]
    # @return [Hash] the payload's `machine`, now retired.
    def perform(machine_id:)
      tenant!.authorize!(:manage_machines)
      machine = find_machine!(machine_id)
      now = Time.current
      Machine.transaction do
        lock_without_upcoming_bookings!(machine, "Cancel this machine's upcoming bookings before retiring it.", now: now)
        machine.update!(retired_at: now) unless machine.retired?
      end
      { machine: machine }
    end
  end
end
