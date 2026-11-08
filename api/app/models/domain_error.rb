# An expected, user-facing failure with a stable machine-readable code.
# GraphQL mutations turn these into typed `errors` in their payloads; `field`
# names the input the problem relates to, when there is one.
#
# @example
#   raise DomainError.new("SLOT_TAKEN", "That slot is no longer free.")
class DomainError < StandardError
  # @return [String] a value of the GraphQL ErrorCode enum.
  attr_reader :code
  # @return [String, nil] the camelCase input name the problem relates to.
  attr_reader :field

  # @param code [String] a value of the GraphQL ErrorCode enum.
  # @param message [String] a sentence that can be shown as it is.
  # @param field [String, nil] the input the problem relates to.
  def initialize(code, message, field: nil)
    super(message)
    @code = code
    @field = field
  end
end
