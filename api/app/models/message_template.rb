# A workspace's customised wording for one message kind. Saving validates it by
# rendering against sample values, so an invalid template is never stored.
class MessageTemplate < ApplicationRecord
  include TenantOwned

  enum :kind, { booking_confirmed: "booking_confirmed", booking_cancelled: "booking_cancelled" }, validate: true

  validates :kind, uniqueness: { scope: :workspace_id }
  validates :subject, presence: true, length: { maximum: MessageRenderer::MAX_SUBJECT_LENGTH }
  validates :body, presence: true, length: { maximum: MessageRenderer::MAX_BODY_LENGTH }
  validate :renders_with_allowed_variables

  private

  def renders_with_allowed_variables
    # Over-long input is already an error; do not spend time rendering it.
    return if errors.any?

    MessageRenderer.check(subject: subject.to_s, body: body.to_s).each { |problem| errors.add(:base, problem) }
  end
end
