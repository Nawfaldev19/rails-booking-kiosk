module Types
  # A workspace's wording for one message kind, or the built-in default.
  class MessageTemplateType < BaseObject
    graphql_name "MessageTemplate"
    description "A workspace's wording for one kind of message (Liquid, branching tags only)."

    field :kind, MessageKindEnum, "Which message this template is for.", null: false
    field :subject, String, "Liquid source of the subject line.", null: false
    field :body, String, "Liquid source of the plain-text body.", null: false
    field :customised, Boolean, "False while the built-in default is in use.", null: false
  end
end
