module Types
  # The signed-in person's own account.
  class UserType < BaseObject
    graphql_name "User"
    description "The signed-in person's own account."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :name, String, "Display name.", null: false
    field :email, String, "Sign-in email, stored lower-case.", null: false
  end
end
