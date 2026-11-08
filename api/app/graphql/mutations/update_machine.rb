module Mutations
  # Edits a machine. Changing the slot length waits for in-flight holds and is
  # refused while the machine has upcoming bookings.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_INPUT, INVALID_STATE.
  class UpdateMachine < MachineMutation
    description "Renames a machine or changes its description or slot length. Only the arguments given change. Managers only."

    argument :machine_id, ID, "The machine to change.", required: true
    argument :name, String, "New name, unique among machines in service.", required: false
    argument :description, String, "Null clears the description.", required: false
    argument :slot_minutes, Integer, "30 or 60; only while the machine has no upcoming bookings.", required: false

    # @param machine_id [String]
    # @param changes [Hash] the optional arguments that were given.
    # @return [Hash] the payload's `machine`.
    def perform(machine_id:, **changes)
      tenant!.authorize!(:manage_machines)
      machine = find_machine!(machine_id)
      Machine.transaction do
        if changes.key?(:slot_minutes) && changes[:slot_minutes] != machine.slot_minutes
          lock_without_upcoming_bookings!(machine, "Slot length can only change when the machine has no upcoming bookings.",
            now: Time.current)
        end
        machine.update!(changes)
      end
      { machine: machine }
    end
  end
end
