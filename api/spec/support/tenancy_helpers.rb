module TenancyHelpers
  # A workspace member wrapped in the Tenant the API would build for them.
  def tenant_for(role: "member", workspace: create(:workspace), user: create(:user))
    membership = create(:membership, workspace: workspace, user: user, role: role)
    Tenant.new(workspace: workspace, membership: membership)
  end

  def local_time(workspace, *parts)
    workspace.zone.local(*parts)
  end
end

RSpec.configure { |config| config.include TenancyHelpers }
