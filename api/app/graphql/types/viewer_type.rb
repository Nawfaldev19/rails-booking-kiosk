module Types
  # The signed-in user plus their memberships. Resolves from a User record.
  class ViewerType < BaseObject
    graphql_name "Viewer"
    description "The signed-in person and the workspaces they can open."
    field :user, UserType, "The account.", null: false
    field :memberships, [ MembershipType ], "Every workspace the person belongs to, by workspace name.", null: false

    # @return [User]
    def user
      object
    end

    # @return [ActiveRecord::Relation<Membership>] with workspaces preloaded, ordered by workspace name.
    def memberships
      object.memberships.includes(:workspace).order("workspaces.name").references(:workspace)
    end
  end
end
