module Types
  # Base class for every field, so arguments use {Types::BaseArgument}.
  class BaseField < GraphQL::Schema::Field
    argument_class Types::BaseArgument
  end
end
