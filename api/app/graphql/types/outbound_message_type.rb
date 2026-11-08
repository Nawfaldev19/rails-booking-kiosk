module Types
  # One entry in the transactional outbox (ADR 0005).
  class OutboundMessageType < BaseObject
    graphql_name "OutboundMessage"
    description "A message recorded in the outbox with the change that caused it."

    field :id, ID, "Opaque identifier (a UUID).", null: false
    field :kind, OutboundMessageKindEnum, "What the message is about.", null: false
    field :recipient, String, "The recipient's email address.", null: false
    field :subject, String, "Subject as rendered when the message was recorded.", null: false
    field :body, String, "Plain-text body as rendered when the message was recorded. An invitation's one-time token reads `hidden`.",
      null: false, method: :visible_body
    field :status, MessageStatusEnum, "Delivery state.", null: false
    field :attempts, Integer, "Delivery attempts so far (at most five per round).", null: false
    field :last_error, String, "Why the latest delivery attempt failed, if it did.", null: true
    field :used_fallback_template, Boolean,
      "True when the workspace's template failed to render and the built-in default was used.", null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, "When the message was recorded.", null: false
  end
end
