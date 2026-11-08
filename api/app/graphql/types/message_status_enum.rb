module Types
  # Delivery state of an outbox message.
  class MessageStatusEnum < BaseEnum
    graphql_name "MessageStatus"
    description "Delivery state of an outbox message."
    value "PENDING", "Waiting for its first attempt or a retry.", value: "pending"
    value "DELIVERED", "Accepted by the mail server.", value: "delivered"
    value "FAILED", "Gave up after five attempts; a manager can retry it.", value: "failed"
  end
end
