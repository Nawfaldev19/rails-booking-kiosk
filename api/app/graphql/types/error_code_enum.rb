module Types
  # Every code a DomainError can carry. Clients branch on these, never on message text.
  class ErrorCodeEnum < BaseEnum
    graphql_name "ErrorCode"
    description "Stable codes for expected failures, safe to branch on in clients."

    DESCRIPTIONS = {
      "UNAUTHENTICATED" => "No one is signed in.",
      "FORBIDDEN" => "The viewer is not a member of the workspace, or their role cannot do this.",
      "NOT_FOUND" => "No such record in this workspace (a record in another workspace is reported the same way).",
      "INVALID_INPUT" => "An argument failed validation; `field` names it when it is a single input.",
      "RATE_LIMITED" => "Too many password attempts for this account or client address; try again in a few minutes.",
      "INVALID_CREDENTIALS" => "The email and password do not match.",
      "SLOT_TAKEN" => "Someone else holds or booked an overlapping slot on this machine.",
      "HOLD_EXPIRED" => "The hold ran out before it was confirmed.",
      "HOLD_LIMIT_REACHED" => "The member already has the workspace's maximum number of open holds.",
      "MISALIGNED_SLOT" => "The start is not on a whole minute aligned to the machine's slot length from opening time.",
      "OUTSIDE_OPENING_HOURS" => "The slot does not fit inside the workspace's opening hours.",
      "SLOT_IN_PAST" => "The slot has already started.",
      "MACHINE_RETIRED" => "The machine is out of service.",
      "INVALID_STATE" => "The record is not in a state that allows this change."
    }.freeze

    DESCRIPTIONS.each { |code, text| value code, text }
  end
end
