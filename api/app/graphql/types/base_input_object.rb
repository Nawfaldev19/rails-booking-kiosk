module Types
  # Base class for input objects. The schema has none today (mutations take
  # plain arguments); it is kept so a future input type inherits the base argument class.
  class BaseInputObject < GraphQL::Schema::InputObject
    argument_class Types::BaseArgument
  end
end
