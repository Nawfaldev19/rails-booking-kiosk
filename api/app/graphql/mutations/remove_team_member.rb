module Mutations
  # Takes a staff member or manager out of the workspace.
  #
  # Auth: managers, never on their own membership.
  # Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE (your own membership, or one with bookings).
  class RemoveTeamMember < BaseMutation
    description <<~TEXT.squish
      Removes someone from the workspace; they lose access at once. Refused for your own membership and for
      anyone with bookings in the workspace (change their role to MEMBER instead). Managers only.
    TEXT

    argument :membership_id, ID, "The `StaffMember.id` to remove.", required: true

    field :removed_id, ID, "The membership that was removed; null when `errors` is not empty.", null: true

    # @param membership_id [String]
    # @return [Hash] the payload's `removedId`.
    def perform(membership_id:)
      { removed_id: Teams::Remove.new(tenant: tenant!, membership_id: membership_id).call.id }
    end
  end
end
