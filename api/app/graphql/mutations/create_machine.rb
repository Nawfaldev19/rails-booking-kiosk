module Mutations
  # Adds a machine to the workspace.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, INVALID_INPUT (with `field`).
  class CreateMachine < MachineMutation
    description "Adds a machine. Its name must be unique among the workspace's machines in service. Managers only."

    argument :name, String, "Up to 80 characters; surrounding spaces are removed.", required: true
    argument :description, String, "Optional; null is the same as an empty description.", required: false, default_value: ""
    argument :slot_minutes, Integer, "30 or 60.", required: true

    # @param name [String]
    # @param description [String, nil]
    # @param slot_minutes [Integer]
    # @return [Hash] the payload's `machine`.
    def perform(name:, description:, slot_minutes:)
      tenant!.authorize!(:manage_machines)
      { machine: tenant!.machines.create!(name: name, description: description, slot_minutes: slot_minutes) }
    end
  end
end
