# The GraphQL schema: roots, cost limits and the mapping of query-level domain
# errors. Its SDL is committed as schema.graphql (`bin/rails booking_kiosk:schema:dump`).
#
# @see docs/reference/api.md
class BookingKioskSchema < GraphQL::Schema
  query Types::QueryType
  mutation Types::MutationType

  # Bound the work one request can ask for, so one query cannot exhaust the
  # server. The controller also refuses query documents over 10,000 characters.
  max_query_string_tokens 1_000
  max_depth 10
  max_complexity 400
  default_max_page_size 50
  default_page_size 20

  # The SDL is committed (schema.graphql), so production has no need to answer
  # introspection; development and test keep it for tools such as GraphiQL clients.
  disable_introspection_entry_points if Rails.env.production?

  # Expected failures inside queries become errors with a stable code.
  rescue_from(DomainError) do |error|
    raise GraphQL::ExecutionError.new(error.message, extensions: { code: error.code })
  end
end
