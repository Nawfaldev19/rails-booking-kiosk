module Types
  # Relay connection base. Edges, the edge list and nodes are non-null, so
  # generated client types carry no needless null checks (ADR 0004).
  class BaseConnection < GraphQL::Types::Relay::BaseConnection
    edges_nullable(false)
    edge_nullable(false)
    node_nullable(false)
  end
end
