module Types
  # Relay edge base whose node is never null.
  class BaseEdge < GraphQL::Types::Relay::BaseEdge
    node_nullable(false)
  end
end
