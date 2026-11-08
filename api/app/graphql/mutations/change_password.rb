module Mutations
  # Changes the signed-in person's password after checking the current one.
  #
  # Auth: signed in. Errors: UNAUTHENTICATED, INVALID_CREDENTIALS (current password wrong),
  # INVALID_INPUT (new password too short or long), RATE_LIMITED.
  class ChangePassword < BaseMutation
    description <<~TEXT.squish
      Changes the signed-in person's password. The current password is checked under the sign-in rate limit.
      Every other session of the account ends; this one continues with a fresh session cookie.
    TEXT

    argument :current_password, String, "The password in use now.", required: true
    argument :new_password, String, "The new password: 10 to 72 characters.", required: true

    field :viewer, Types::ViewerType, "The signed-in person; null when `errors` is not empty.", null: true

    # @param current_password [String]
    # @param new_password [String]
    # @return [Hash] the payload's `viewer`.
    def perform(current_password:, new_password:)
      user = current_user!
      authenticated = RateLimiter.password_attempt(email: user.email, remote_ip: context[:remote_ip]) do
        user.authenticate_password(current_password)
      end
      raise DomainError.new("INVALID_CREDENTIALS", "That is not your current password.", field: "currentPassword") unless authenticated

      unless user.update(password: new_password)
        raise DomainError.new("INVALID_INPUT", user.errors.full_messages_for(:password).first, field: "newPassword")
      end
      # A new bcrypt salt invalidates every session token issued before; issue this session a new one.
      context[:sign_in].call(user)
      { viewer: user }
    end
  end
end
