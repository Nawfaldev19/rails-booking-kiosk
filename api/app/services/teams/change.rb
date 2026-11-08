# Changes to who is on a workspace's team: new roles and removals.
module Teams
  # Shared rules for changing someone else's place in a workspace.
  #
  # A manager cannot change or remove their own membership (another manager
  # can). The acting manager's role is checked again while every manager
  # membership of the workspace is locked, so two managers demoting each other
  # at the same moment cannot both succeed. Together these keep at least one
  # manager in every workspace: whoever makes a change is still a manager.
  class Change
    # @param tenant [Tenant] the acting manager's workspace access.
    # @param membership_id [String] the membership to change.
    def initialize(tenant:, membership_id:)
      @tenant = tenant
      @membership_id = membership_id
    end

    private

    # Runs the block in a transaction, after the checks above.
    #
    # @yieldparam membership [Membership] locked for update.
    # @return [Object] what the block returns.
    # @raise [DomainError] FORBIDDEN, NOT_FOUND or INVALID_STATE.
    def with_target
      @tenant.authorize!(:manage_staff)
      Membership.transaction do
        # Waits for any team change in flight; a manager demoted by it drops out of this list.
        managers = @tenant.memberships.manager.order(:id).lock.pluck(:id)
        unless managers.include?(@tenant.membership.id)
          raise DomainError.new("FORBIDDEN", "Your role in this workspace cannot do that.")
        end

        membership = @tenant.memberships.lock.find_by(id: @membership_id) or
          raise DomainError.new("NOT_FOUND", "That person is not in this workspace.")
        if membership.id == @tenant.membership.id
          raise DomainError.new("INVALID_STATE", "You cannot change your own role or remove yourself. Ask another manager.")
        end

        yield membership
      end
    end
  end
end
