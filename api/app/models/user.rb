# A person's global account. Emails are normalised (trimmed, lower-case) and
# passwords hashed with bcrypt; roles live on memberships, not here.
#
# An account added by a manager starts without a password (`password_digest`
# is null), so it cannot sign in until its owner accepts the invitation and
# chooses one. No one else ever sets or learns that password.
#
# @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
class User < ApplicationRecord
  # The longest a session lasts from sign-in, however active it is.
  SESSION_LIFETIME = 12.hours

  # Presence is not required: invited accounts have no password yet.
  has_secure_password validations: false
  has_many :memberships, dependent: :destroy
  has_many :workspaces, through: :memberships

  # A session token stops working once SESSION_LIFETIME has passed, and as soon
  # as the password changes (the bcrypt salt is part of what is signed).
  generates_token_for :session, expires_in: SESSION_LIFETIME do
    password_salt&.last(10)
  end

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true, length: { maximum: 80 }
  validates :email, presence: true, uniqueness: true, length: { maximum: 254 },
    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 10, maximum: 72 }, allow_nil: true
  validate :password_fits_bcrypt

  # @return [Boolean] true while the account has no password (an invitation not yet accepted).
  def invited?
    password_digest.nil?
  end

  private

  # bcrypt ignores everything after 72 bytes, so a longer password would not mean what it says.
  def password_fits_bcrypt
    return if password.nil? || password.bytesize <= ActiveModel::SecurePassword::MAX_PASSWORD_LENGTH_ALLOWED

    errors.add(:password, :too_long, count: ActiveModel::SecurePassword::MAX_PASSWORD_LENGTH_ALLOWED)
  end
end
