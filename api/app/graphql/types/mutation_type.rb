module Types
  # The mutation root. Every mutation returns a payload with `errors: [UserError!]!`
  # (see Mutations::BaseMutation); workspace mutations read the workspace from
  # the X-Booking-Kiosk-Workspace header.
  class MutationType < BaseObject
    graphql_name "Mutation"
    description "Entry points for changes. Expected failures are returned in each payload's `errors`, never thrown."

    field :sign_in, mutation: Mutations::SignIn
    field :sign_out, mutation: Mutations::SignOut
    field :accept_invitation, mutation: Mutations::AcceptInvitation
    field :change_password, mutation: Mutations::ChangePassword
    field :place_hold, mutation: Mutations::PlaceHold
    field :confirm_booking, mutation: Mutations::ConfirmBooking
    field :release_hold, mutation: Mutations::ReleaseHold
    field :cancel_booking, mutation: Mutations::CancelBooking
    field :mark_arrival, mutation: Mutations::MarkArrival
    field :create_machine, mutation: Mutations::CreateMachine
    field :update_machine, mutation: Mutations::UpdateMachine
    field :retire_machine, mutation: Mutations::RetireMachine
    field :add_team_member, mutation: Mutations::AddTeamMember
    field :change_team_role, mutation: Mutations::ChangeTeamRole
    field :remove_team_member, mutation: Mutations::RemoveTeamMember
    field :save_message_template, mutation: Mutations::SaveMessageTemplate
    field :reset_message_template, mutation: Mutations::ResetMessageTemplate
    field :retry_message, mutation: Mutations::RetryMessage
  end
end
