# Which roles may do what. One table, so the whole permission model is reviewable at a glance.
module Policy
  RULES = {
    view_catalogue: %w[member manager staff],
    book: %w[member manager],
    view_day_sheet: %w[staff manager],
    mark_arrival: %w[staff manager],
    cancel_any_booking: %w[manager],
    manage_machines: %w[manager],
    manage_staff: %w[manager],
    manage_messages: %w[manager],
    view_utilisation: %w[manager]
  }.freeze

  # @param role [String, Symbol] a membership role.
  # @param capability [Symbol] a key of {RULES}.
  # @return [Boolean]
  # @raise [KeyError] for an unknown capability, so a typo fails loudly.
  def self.allows?(role, capability)
    RULES.fetch(capability).include?(role.to_s)
  end
end
