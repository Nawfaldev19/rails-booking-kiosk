# The transactional outbox: recording messages with booking changes and
# delivering them afterwards (ADR 0005).
module Messages
  # Sends one due outbox message.
  #
  # The message is first claimed in its own short transaction: SKIP LOCKED lets
  # only one worker in, and the claim moves `next_attempt_at` forward as a lease,
  # so no other worker picks the message up while it is being sent. The SMTP call
  # then runs outside any transaction or record lock.
  #
  # Delivery is at least once: if the process dies after the mail server accepted
  # the message but before it is marked delivered, the lease runs out and the
  # message is sent again.
  #
  # @see docs/adr/0005-transactional-outbox-for-messages.md
  class Deliver
    # @param message_id [String]
    # @param now [Time]
    # @return [Symbol] :delivered, :retry_later, :failed (gave up), or :skipped (not due,
    #   already claimed by another worker, or gone).
    def self.call(message_id, now: Time.current)
      message = claim(message_id, now)
      return :skipped unless message

      begin
        MessageMailer.outbound(message).deliver_now
      rescue StandardError => error
        return record_failure(message, error, now)
      end
      # An invitation's token is only needed until the mail server has it.
      message.update!(status: :delivered, delivered_at: now, last_error: nil, body: message.visible_body)
      :delivered
    end

    # @return [OutboundMessage, nil] the claimed message, or nil when it is not due or another worker holds it.
    def self.claim(message_id, now)
      OutboundMessage.transaction do
        message = OutboundMessage.due(now).lock("FOR UPDATE SKIP LOCKED").find_by(id: message_id)
        message&.update!(attempts: message.attempts + 1, next_attempt_at: now + OutboundMessage::SEND_LEASE)
        message
      end
    end

    # @return [Symbol] :failed after the last attempt, otherwise :retry_later.
    def self.record_failure(message, error, now)
      gave_up = message.attempts >= OutboundMessage::MAX_ATTEMPTS
      message.update!(
        status: gave_up ? :failed : :pending,
        next_attempt_at: now + OutboundMessage.retry_delay(message.attempts),
        last_error: "#{error.class}: #{error.message}".truncate(500)
      )
      Rails.logger.error({ msg: "message_delivery_failed", message_id: message.id, attempts: message.attempts,
                           error: error.class.name }.to_json)
      gave_up ? :failed : :retry_later
    end
    private_class_method :claim, :record_failure
  end
end
