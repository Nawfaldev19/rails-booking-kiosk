# The only door to workspace-owned data from the API layer.
#
# A Tenant is built from the signed-in user and the workspace they asked for,
# and only if that user is a member of it. Every relation it hands out is
# already filtered to that workspace, so resolvers cannot accidentally read or
# write another workspace's records.
#
# @see docs/adr/0003-tenant-isolation-through-a-scoped-access-object-and-composite-keys.md
class Tenant
  # @return [Workspace]
  attr_reader :workspace
  # @return [Membership] the viewer's membership in {#workspace}.
  attr_reader :membership

  # @param user [User, nil]
  # @param slug [String, nil]
  # @return [Tenant, nil] nil when signed out, the slug is blank or unknown, or the user is not a member.
  def self.resolve(user:, slug:)
    return nil if user.nil? || slug.blank?

    membership = user.memberships.includes(:workspace).joins(:workspace).find_by(workspaces: { slug: slug })
    membership && new(workspace: membership.workspace, membership: membership)
  end

  # @param workspace [Workspace]
  # @param membership [Membership]
  # @raise [ArgumentError] when the membership belongs to another workspace.
  def initialize(workspace:, membership:)
    raise ArgumentError, "membership belongs to another workspace" unless membership.workspace_id == workspace.id

    @workspace = workspace
    @membership = membership
  end

  delegate :machines, :bookings, :memberships, :message_templates, :outbound_messages, to: :workspace

  # @return [String] the viewer's role in this workspace.
  def role
    membership.role
  end

  # @return [ActiveRecord::Relation<Booking>] the viewer's own bookings in this workspace.
  def own_bookings
    bookings.where(membership_id: membership.id)
  end

  # @param capability [Symbol] a key of Policy::RULES.
  # @return [Boolean]
  def can?(capability)
    Policy.allows?(role, capability)
  end

  # @param capability [Symbol] a key of Policy::RULES.
  # @return [void]
  # @raise [DomainError] FORBIDDEN when the role does not have the capability.
  def authorize!(capability)
    raise DomainError.new("FORBIDDEN", "Your role in this workspace cannot do that.") unless can?(capability)
  end
end
