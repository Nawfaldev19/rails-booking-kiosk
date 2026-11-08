module Mutations
  # Lets an invited person choose their password with the one-time link, then signs them in.
  #
  # Auth: none (the token is the credential). Attempts are limited per client address.
  # Errors: NOT_FOUND (unknown, used or expired link), INVALID_INPUT (password too short or long), RATE_LIMITED.
  #
  # @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
  class AcceptInvitation < BaseMutation
    description <<~TEXT.squish
      Sets the password of an invited account from the token in its invitation link, and starts a session.
      A link works once and expires after 72 hours; an unknown, used or expired one fails with NOT_FOUND.
    TEXT

    argument :token, String, "The token from the invitation link (the part after `#token=`).", required: true
    argument :password, String, "The new password: 10 to 72 characters.", required: true

    field :viewer, Types::ViewerType, "The signed-in person; null when `errors` is not empty.", null: true

    # @param token [String]
    # @param password [String]
    # @return [Hash] the payload's `viewer`.
    def perform(token:, password:)
      if context[:remote_ip].present?
        RateLimiter.new(key: "invitation:address:#{context[:remote_ip]}", limit: RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS,
          period: RateLimiter::PASSWORD_WINDOW).check!
      end

      user = Invitation.transaction do
        # The record lock makes the token single-use even when two requests race.
        invitation = Invitation.unexpired.lock.find_by(token_digest: Invitation.digest(token))
        user = invitation&.membership&.user
        unless user&.invited?
          raise DomainError.new("NOT_FOUND", "This invitation link is not valid any more. Ask a manager to send a new one.")
        end

        user.update!(password: password)
        Invitation.where(membership_id: user.memberships.select(:id)).delete_all
        user
      end
      context[:sign_in].call(user)
      { viewer: user }
    end
  end
end
