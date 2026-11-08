module Mutations
  # Shared shape and helpers for the manager's machine mutations.
  class MachineMutation < BaseMutation
    field :machine, Types::MachineType, "The machine after the change; null when `errors` is not empty.", null: true

    private

    # @param id [String] a machine ID.
    # @return [Machine]
    # @raise [DomainError] NOT_FOUND when the machine is not in this workspace.
    def find_machine!(id)
      tenant!.machines.find_by(id: id) or raise DomainError.new("NOT_FOUND", "That machine does not exist in this workspace.")
    end

    # Takes the machine's record lock, which waits for any hold being placed on it
    # (PlaceHold holds a shared lock), then checks for upcoming bookings. Call
    # inside a transaction; the lock lasts until it commits.
    #
    # @param machine [Machine]
    # @param message [String] the INVALID_STATE message to use.
    # @param now [Time]
    # @raise [DomainError] INVALID_STATE when the machine has upcoming bookings.
    def lock_without_upcoming_bookings!(machine, message, now:)
      machine.lock!
      raise DomainError.new("INVALID_STATE", message) if machine.upcoming_bookings?(now)
    end
  end
end
