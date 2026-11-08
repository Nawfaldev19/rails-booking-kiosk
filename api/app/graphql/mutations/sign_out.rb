module Mutations
  # Ends the session by resetting it. Safe to call when already signed out.
  class SignOut < BaseMutation
    description "Ends the session. Succeeds even when no one is signed in."

    field :signed_out, Boolean, "Always true.", null: false

    # @return [Hash] the payload's `signedOut`.
    def perform
      context[:sign_out].call
      { signed_out: true }
    end
  end
end
