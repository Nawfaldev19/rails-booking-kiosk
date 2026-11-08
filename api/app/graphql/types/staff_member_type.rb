module Types
  # A staff or manager membership, shown to managers on the Team page.
  class StaffMemberType < BaseObject
    graphql_name "StaffMember"
    description "Someone with the staff or manager role in the workspace."

    field :id, ID, "Opaque identifier of the membership (a UUID).", null: false
    field :role, RoleEnum, "STAFF or MANAGER.", null: false
    field :name, String, "Display name.", null: false
    field :email, String, "Sign-in email; visible to the workspace's managers only.", null: false
    field :invitation_pending, Boolean, "True until an invited person has chosen their password.", null: false
    field :is_viewer, Boolean, "True for the signed-in manager's own membership, which they cannot change.", null: false

    # @return [String]
    def name = object.user.name
    # @return [String]
    def email = object.user.email
    # @return [Boolean]
    def invitation_pending = object.user.invited?
    # @return [Boolean]
    def is_viewer = object.id == tenant&.membership&.id
  end
end
