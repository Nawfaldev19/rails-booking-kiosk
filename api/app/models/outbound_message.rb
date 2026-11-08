# A transactional outbox entry. It is written in the same database transaction
# as the change that caused it, so a message can never be lost or sent for a
# change that rolled back. Delivery happens afterwards and is retried.
#
# Invitation messages carry a one-time token in their link. Managers can read
# the outbox, so the token is masked whenever a body is shown ({#visible_body})
# and removed from the stored body once the message has been delivered.
class OutboundMessage < ApplicationRecord
  include TenantOwned

  MAX_ATTEMPTS = 5
  # How long a worker owns a message while it is sending it.
  SEND_LEASE = 5.minutes

  # The token in an invitation link: everything after `#token=` up to the end of the URL.
  LINK_TOKEN = /(?<=#token=)[A-Za-z0-9_-]+/

  belongs_to :booking, optional: true

  enum :status, { pending: "pending", delivered: "delivered", failed: "failed" }, validate: true
  enum :kind, { booking_confirmed: "booking_confirmed", booking_cancelled: "booking_cancelled", invitation: "invitation" },
    validate: true, prefix: :about
  validates :booking, presence: true, unless: :about_invitation?

  # Set from the app clock (not the database's) so it agrees with the `now` used everywhere else.
  attribute :next_attempt_at, :datetime, default: -> { Time.current }

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }
  # Strictly older than the entry at (created_at, id) in newest-first order; the keyset cursor of the outbox page.
  scope :before_entry, ->(created_at, id) { where("(created_at, id) < (?, ?)", created_at, id) }
  scope :due, ->(now = Time.current) { pending.where(next_attempt_at: ..now) }

  # Wait 1, 2, 4 and then 8 minutes after successive failures.
  #
  # @param attempts [Integer] attempts made so far (1 or more).
  # @return [ActiveSupport::Duration]
  # @example
  #   OutboundMessage.retry_delay(3) # => 4 minutes
  def self.retry_delay(attempts)
    (2**(attempts - 1)).minutes
  end

  # @return [String] the body with any invitation token replaced by "hidden".
  def visible_body
    body.gsub(LINK_TOKEN, "hidden")
  end
end
