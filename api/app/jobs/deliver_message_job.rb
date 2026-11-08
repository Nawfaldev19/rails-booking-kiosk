# Delivers one outbox message after the transaction that recorded it commits.
# Losing the job is safe: `booking_kiosk:tick` delivers any message that is still due.
class DeliverMessageJob < ApplicationJob
  queue_as :default

  # @param message_id [String]
  # @return [Symbol] the outcome from {Messages::Deliver.call}.
  def perform(message_id)
    Messages::Deliver.call(message_id)
  end
end
