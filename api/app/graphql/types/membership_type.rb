module Types
  # One of the viewer's own workspace memberships.
  class MembershipType < BaseObject
    graphql_name "Membership"
    description "The viewer's role in one workspace."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :role, RoleEnum, "The viewer's role in this workspace.", null: false
    field :workspace, WorkspaceSummaryType, "The workspace's name and slug.", null: false
  end
end
