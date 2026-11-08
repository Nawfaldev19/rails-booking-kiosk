# GraphQL mutations. Each one checks the role through Tenant and returns typed errors.
module Mutations
  # Mutations report expected failures as typed `errors` in their payload
  # (never as top-level GraphQL errors), so clients can branch on stable codes.
  class BaseMutation < GraphQL::Schema::Mutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    object_class Types::BaseObject
    null false

    field :errors, [ Types::UserErrorType ], "Expected problems; empty when the mutation succeeded.", null: false

    # Runs the subclass's `perform` and turns expected failures into payload errors.
    #
    # @param args [Hash] the mutation's arguments, as keywords.
    # @return [Hash] the payload: `perform`'s result plus `errors: []`, or only `errors`.
    def resolve(**args)
      perform(**args).merge(errors: [])
    rescue DomainError => error
      { errors: [ { code: error.code, message: error.message, field: error.field } ] }
    rescue ActiveRecord::RecordInvalid => error
      { errors: validation_errors(error.record) }
    end

    private

    # @return [Tenant] the workspace named by the X-Booking-Kiosk-Workspace header.
    # @raise [DomainError] UNAUTHENTICATED when signed out; FORBIDDEN when not a member.
    def tenant!
      current_user!
      context[:tenant] or raise DomainError.new("FORBIDDEN", "Choose a workspace you belong to.")
    end

    # @return [User]
    # @raise [DomainError] UNAUTHENTICATED when signed out.
    def current_user!
      context[:current_user] or raise DomainError.new("UNAUTHENTICATED", "Please sign in.")
    end

    # @param record [ActiveRecord::Base] a record that failed validation.
    # @return [Array<Hash>] one INVALID_INPUT error per problem, with camelCase field names.
    def validation_errors(record)
      record.errors.map do |problem|
        field = problem.attribute == :base ? nil : problem.attribute.to_s.camelize(:lower)
        { code: "INVALID_INPUT", message: problem.full_message, field: field }
      end
    end
  end
end
