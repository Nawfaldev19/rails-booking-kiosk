module Types
  # A typed, expected failure returned in every mutation payload (ADR 0004).
  class UserErrorType < BaseObject
    graphql_name "UserError"
    description "An expected problem with a mutation, such as a slot that was just taken."
    field :code, ErrorCodeEnum, "Stable code to branch on.", null: false
    field :message, String, "A sentence that can be shown to the person as it is.", null: false
    field :field, String, "Input field the problem relates to, when there is one.", null: true
  end
end
