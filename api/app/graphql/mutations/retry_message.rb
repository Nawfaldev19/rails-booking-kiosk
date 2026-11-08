module Mutations
  # Puts a failed outbox message back in the queue with a fresh attempt budget.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, INVALID_STATE (not failed).
  class RetryMessage < BaseMutation
    description "Queues a failed message for another round of delivery attempts. Managers only."

    argument :message_id, ID, "A FAILED message in this workspace's outbox.", required: true

    field :message, Types::OutboundMessageType, "The message, now PENDING.", null: true

    # @param message_id [String]
    # @return [Hash] the payload's `message`.
    def perform(message_id:)
      tenant!.authorize!(:manage_messages)
      message = tenant!.outbound_messages.find_by(id: message_id) or
        raise DomainError.new("NOT_FOUND", "That message does not exist in this workspace.")
      OutboundMessage.transaction do
        message.lock!
        raise DomainError.new("INVALID_STATE", "Only a failed message can be retried.") unless message.failed?

        message.update!(status: :pending, attempts: 0, next_attempt_at: Time.current)
      end
      DeliverMessageJob.perform_later(message.id)
      { message: message }
    end
  end
end
