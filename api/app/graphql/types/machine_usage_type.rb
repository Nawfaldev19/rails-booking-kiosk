module Types
  # Confirmed usage of one machine over the reporting window.
  class MachineUsageType < BaseObject
    graphql_name "MachineUsage"
    description "Confirmed usage of one machine over the last 14 days."

    field :machine, MachineType, "The machine.", null: false
    field :booked_hours, Float, "Hours of confirmed bookings, rounded to one decimal place.", null: false
    field :booking_count, Integer, "Number of confirmed bookings.", null: false
  end
end
