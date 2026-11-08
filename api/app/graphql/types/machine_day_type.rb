module Types
  # One machine's slots on one day, as computed by Bookings::Availability.
  class MachineDayType < BaseObject
    graphql_name "MachineDay"
    description "One machine's slots on one day."

    field :machine, MachineType, "The machine.", null: false
    field :slots, [ SlotType ], "Every slot from opening to closing time, in order.", null: false
  end
end
