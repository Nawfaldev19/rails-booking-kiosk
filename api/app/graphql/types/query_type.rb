module Types
  # The query root. Signed-out callers get a null viewer and null workspaces,
  # never an error, so clients can render the sign-in page from one query.
  class QueryType < BaseObject
    graphql_name "Query"
    description "Entry points for reading. Everything inside a workspace is reached through `workspace(slug:)`."

    field :viewer, ViewerType, "The signed-in person, or null when signed out.", null: true
    field :server_time, GraphQL::Types::ISO8601DateTime,
      "The server's clock, so clients can correct countdowns for a fast or slow device clock.", null: false
    field :workspace, WorkspaceType, "A workspace the viewer belongs to, or null.", null: true do
      argument :slug, String, "The workspace's URL slug, such as `larkspur`.", required: true
    end

    # @return [User, nil] the signed-in user, or nil when signed out.
    def viewer
      context[:current_user]
    end

    # @return [ActiveSupport::TimeWithZone] the current time in UTC.
    def server_time
      Time.current.utc
    end

    # Fields below this one read the tenant from scoped context, so a single
    # request can never mix data from two workspaces.
    #
    # @param slug [String] the workspace's slug.
    # @return [Workspace, nil] nil when signed out, when the slug does not exist,
    #   or when the viewer is not a member (the three cases look the same).
    def workspace(slug:)
      scoped_tenant = Tenant.resolve(user: context[:current_user], slug: slug)
      context.scoped_set!(:tenant, scoped_tenant)
      scoped_tenant&.workspace
    end
  end
end
