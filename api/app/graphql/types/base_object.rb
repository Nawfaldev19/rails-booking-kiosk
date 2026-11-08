# GraphQL object and enum types. Every element carries a description.
module Types
  # Base class for every object type. It wires in the base field, edge and
  # connection classes and gives resolvers access to the request's tenant.
  class BaseObject < GraphQL::Schema::Object
    field_class Types::BaseField
    edge_type_class(Types::BaseEdge)
    connection_type_class(Types::BaseConnection)

    private

    # The workspace the request is scoped to. Nil when signed out or not a member.
    #
    # @return [Tenant, nil]
    def tenant
      context[:tenant]
    end

    # The request's tenant, for fields that only make sense inside a workspace.
    #
    # @return [Tenant]
    # @raise [DomainError] FORBIDDEN when there is no tenant.
    def tenant!
      tenant or raise DomainError.new("FORBIDDEN", "Choose a workspace you belong to.")
    end
  end
end
