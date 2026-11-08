module Types
  # A draft template rendered against sample values.
  class MessagePreviewType < BaseObject
    graphql_name "MessagePreview"
    description "A draft template rendered against sample values."

    field :subject, String, "The rendered subject line.", null: false
    field :body, String, "The rendered plain-text body.", null: false
    field :problems, [ String ], "Why the template would fall back to the default, if it would.", null: false
  end
end
