# Pagination that is not shared with graphql-ruby's built-in offset connections.
module Connections
  # Pages a newest-first relation by its (created_at, id) key rather than by
  # offset. A message recorded while someone is paging is newer than every
  # cursor, so it cannot shift later pages and "Load more" never repeats or
  # skips an entry. Forward paging (`first`/`after`) only.
  #
  # The relation must respond to `before_entry(created_at, id)` and be ordered
  # newest first, as OutboundMessage's scopes are.
  #
  # @see docs/reference/api.md
  class NewestFirstConnection < GraphQL::Pagination::Connection
    # @return [Array<ActiveRecord::Base>] the page.
    def nodes
      load_page
      @nodes
    end

    # @return [Boolean] whether older entries remain.
    def has_next_page
      load_page
      @has_next_page
    end

    # @return [Boolean] always false: paging is forward only.
    def has_previous_page
      false
    end

    # @param item [ActiveRecord::Base]
    # @return [String] an opaque cursor naming the item's (created_at, id).
    def cursor_for(item)
      encode("#{item.created_at.utc.iso8601(6)}|#{item.id}")
    end

    private

    def load_page
      return if defined?(@nodes)

      scope = items
      scope = scope.before_entry(*decode_cursor(after)) if after
      size = first || max_page_size
      records = scope.limit(size + 1).to_a
      @has_next_page = records.size > size
      @nodes = records.first(size)
    end

    def decode_cursor(cursor)
      created_at, id = decode(cursor).split("|", 2)
      [ Time.iso8601(created_at), id ]
    rescue ArgumentError, TypeError
      raise GraphQL::ExecutionError.new("That cursor is not valid.", extensions: { code: "INVALID_INPUT" })
    end
  end
end
