module Mutations
  # Adds a staff member or manager.
  #
  # A new email gets an account with no password and an invitation message with
  # a one-time link, so the manager never chooses or learns the password. An
  # email that already has an account joins only with its owner's own password,
  # typed in by the owner to agree to join.
  #
  # Auth: managers.
  # Errors: UNAUTHENTICATED, FORBIDDEN, INVALID_INPUT, INVALID_CREDENTIALS (existing account, wrong
  # or missing password), RATE_LIMITED, INVALID_STATE (already in the workspace, or added at the same moment).
  #
  # @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
  class AddTeamMember < BaseMutation
    description <<~TEXT.squish
      Gives someone a staff or manager role. A new email gets an account without a password and an
      invitation message whose one-time link lets them choose one. An email that already has an account
      is only added when `password` is that account's own, typed in by its owner to agree to join; the
      account keeps its name and password. Adding someone whose invitation is still open sends a new one.
    TEXT

    argument :name, String, "Used only when the account is new.", required: true
    argument :email, String, "Sign-in email of the new or existing account.", required: true
    argument :password, String,
      "Only for an email that already has an account: that account's own password. Leave out for a new account.",
      required: false
    argument :role, Types::RoleEnum, "STAFF or MANAGER; MEMBER is refused with INVALID_INPUT.", required: true

    field :team_member, Types::StaffMemberType, "The new staff membership; null when `errors` is not empty.", null: true

    # @param name [String]
    # @param email [String]
    # @param role [String]
    # @param password [String, nil]
    # @return [Hash] the payload's `team_member`.
    def perform(name:, email:, role:, password: nil)
      tenant!.authorize!(:manage_staff)
      raise DomainError.new("INVALID_INPUT", "Use the member sign-up flow for member accounts.") if role == "member"

      address = User.normalize_value_for(:email, email)
      user = User.find_by(email: address)
      message = nil
      membership = Membership.transaction do
        if user.nil? || user.invited?
          membership, message = invite(user, name: name, address: address, role: role, password: password)
          membership
        else
          join_with_own_password(user, password, role)
        end
      end
      DeliverMessageJob.perform_later(message.id) if message
      { team_member: membership }
    rescue ActiveRecord::RecordNotUnique
      raise DomainError.new("INVALID_STATE", "Someone added this person at the same moment. Refresh the list.", field: "email")
    end

    private

    # A new account, or one whose invitation is still open, gets a fresh one-time link.
    #
    # @return [Array(Membership, OutboundMessage)]
    def invite(user, name:, address:, role:, password:)
      if password.present?
        raise DomainError.new("INVALID_INPUT",
          "New accounts choose their own password from the invitation. Leave Password empty.", field: "password")
      end
      RateLimiter.new(key: "invitations:#{tenant!.workspace.id}", limit: RateLimiter::INVITATIONS_PER_WORKSPACE,
        period: RateLimiter::INVITATION_WINDOW).check!

      user ||= User.create!(name: name.strip, email: address)
      membership = tenant!.memberships.find_by(user: user) || tenant!.memberships.create!(user: user, role: role)
      token = Invitation.issue!(membership)
      [ membership, Messages::Enqueue.invitation(membership: membership, token: token) ]
    end

    # An existing account joins a workspace only with its owner's consent, shown by
    # its own password. Nothing about the account (such as its name) is revealed
    # unless that password is right, and the check shares the sign-in rate limit,
    # so this mutation cannot be used to guess passwords.
    #
    # @return [Membership]
    # @raise [DomainError] INVALID_CREDENTIALS, RATE_LIMITED or INVALID_STATE.
    def join_with_own_password(user, password, role)
      authenticated = RateLimiter.password_attempt(email: user.email, remote_ip: context[:remote_ip]) do
        User.authenticate_by(email: user.email, password: password.to_s)
      end
      unless authenticated
        raise DomainError.new("INVALID_CREDENTIALS",
          "That email already has a Booking Kiosk account. Its owner can type their own password here to join, " \
          "or use a different email.", field: "password")
      end
      if tenant!.memberships.exists?(user: user)
        raise DomainError.new("INVALID_STATE", "That person already belongs to this workspace.", field: "email")
      end

      tenant!.memberships.create!(user: user, role: role)
    end
  end
end
