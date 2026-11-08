module Types
  # Base class for every GraphQL argument and input field in the schema.
  # Kept so arguments can gain shared behaviour in one place.
  class BaseArgument < GraphQL::Schema::Argument
  end
end
