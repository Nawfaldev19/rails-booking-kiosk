module Teams
  # Gives a member, staff member or manager a different role. Taking the staff
  # or manager role away (back to MEMBER) is how access is reduced for someone
  # whose bookings must stay on record.
  class ChangeRole < Change
    # @param role [String] member, staff or manager.
    # @param rest [Hash] tenant and membership_id, as for {Change#initialize}.
    def initialize(role:, **rest)
      super(**rest)
      @role = role
    end

    # @return [Membership] with its new role.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND or INVALID_STATE (your own membership).
    def call
      with_target do |membership|
        membership.update!(role: @role)
        membership
      end
    end
  end
end
