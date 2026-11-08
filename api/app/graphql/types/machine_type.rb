module Types
  # A bookable machine in a workspace.
  class MachineType < BaseObject
    graphql_name "Machine"
    description "A bookable machine, such as a laser cutter."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :name, String, "Unique among the workspace's machines in service.", null: false
    field :description, String, "Short notes for members; empty when there are none.", null: false
    field :slot_minutes, Integer, "Length of each slot: 30 or 60 minutes.", null: false
    field :retired, Boolean, "True once taken out of service; retired machines cannot be booked.", null: false,
      method: :retired?
  end
end
