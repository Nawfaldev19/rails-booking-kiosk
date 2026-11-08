module Types
  # The person behind a booking, exposed by name only so emails never leak to other members.
  class MemberType < BaseObject
    graphql_name "Member"
    description "The person a booking belongs to, by name only."
    field :name, String, "Display name.", null: false

    # @return [String]
    def name
      object.user.name
    end
  end
end
