module Mutations
  # Starts a cookie session after checking the password under the shared rate limit.
  # Invited accounts that have not chosen a password yet cannot sign in.
  #
  # Auth: none. Errors: INVALID_CREDENTIALS, RATE_LIMITED.
  class SignIn < BaseMutation
    description "Starts a session. Failed password attempts are limited per account and per client address."

    argument :email, String, "Sign-in email, in any case and with or without surrounding spaces.", required: true
    argument :password, String, "The account's password.", required: true

    field :viewer, Types::ViewerType, "The signed-in person; null when `errors` is not empty.", null: true

    # @param email [String]
    # @param password [String]
    # @return [Hash] the payload's `viewer`.
    def perform(email:, password:)
      address = User.normalize_value_for(:email, email)
      # authenticate_by takes the same time whether or not the email exists.
      # Only failed attempts use up the rate-limit budgets.
      user = RateLimiter.password_attempt(email: address, remote_ip: context[:remote_ip]) do
        User.authenticate_by(email: address, password: password)
      end
      raise DomainError.new("INVALID_CREDENTIALS", "That email and password do not match.") unless user

      context[:sign_in].call(user)
      { viewer: user }
    end
  end
end
