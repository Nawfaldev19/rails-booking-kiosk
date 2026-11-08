# A one-time link that lets an invited person choose their own password.
#
# The raw token exists only in the invitation message; this table keeps its
# SHA-256 digest (the token is 256 random bits, so a slow hash adds nothing).
# A token works once, and only until it expires.
#
# @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
class Invitation < ApplicationRecord
  include TenantOwned

  LIFETIME = 72.hours

  belongs_to :membership

  scope :unexpired, ->(now = Time.current) { where("expires_at > ?", now) }
  scope :expired, ->(now = Time.current) { where(expires_at: ..now) }

  # Replaces any earlier invitation for the membership with a fresh one.
  #
  # @param membership [Membership] an account that has no password yet.
  # @param now [Time]
  # @return [String] the raw token, to put in the invitation link. It is not stored.
  def self.issue!(membership, now: Time.current)
    token = SecureRandom.urlsafe_base64(32)
    membership.invitations.delete_all
    membership.invitations.create!(workspace: membership.workspace, token_digest: digest(token), expires_at: now + LIFETIME)
    token
  end

  # @param token [String] the raw token from a link.
  # @return [String] its hex SHA-256 digest.
  def self.digest(token)
    OpenSSL::Digest::SHA256.hexdigest(token.to_s)
  end
end
