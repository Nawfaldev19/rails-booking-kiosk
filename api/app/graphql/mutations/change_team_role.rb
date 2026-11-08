module Mutations
  # Changes someone's role in the workspace.
  #
  # Auth: managers, never on their own membership.
  # Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE (your own membership).
  class ChangeTeamRole < BaseMutation
    description <<~TEXT.squish
      Changes someone's role. MEMBER takes away staff and manager access but keeps their bookings. Refused for
      your own membership, so a workspace always keeps the manager who made the change. Managers only.
    TEXT

    argument :membership_id, ID, "The `StaffMember.id` to change.", required: true
    argument :role, Types::RoleEnum, "The new role.", required: true

    field :team_member, Types::StaffMemberType, "The membership with its new role; null when `errors` is not empty.", null: true

    # @param membership_id [String]
    # @param role [String]
    # @return [Hash] the payload's `teamMember`.
    def perform(membership_id:, role:)
      { team_member: Teams::ChangeRole.new(tenant: tenant!, membership_id: membership_id, role: role).call }
    end
  end
end
