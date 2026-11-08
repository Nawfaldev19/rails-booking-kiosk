module Teams
  # Takes someone out of the workspace: the membership and any open invitation
  # for it go. The account stays when it belongs to other workspaces or has a
  # password; an invited account that never chose one and has nowhere else to
  # go is deleted too.
  class Remove < Change
    # @return [Membership] the removed (destroyed) membership.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND, or INVALID_STATE (your own membership, or one
    #   with bookings, which stay on record; change that person's role to MEMBER instead).
    def call
      with_target do |membership|
        if membership.bookings.exists?
          raise DomainError.new("INVALID_STATE",
            "This person has bookings here, which stay on record. Change their role to Member instead.")
        end

        membership.destroy!
        user = membership.user
        user.destroy! if user.invited? && user.memberships.none?
        membership
      end
    end
  end
end
