require "rails_helper"

# The schema documents itself through introspection and the committed SDL, so
# every type, field, argument, input field and enum value must say what it is.
RSpec.describe BookingKioskSchema do
  BUILT_IN_SCALARS = %w[String Int Float Boolean ID].freeze

  def undocumented_elements
    missing = []
    described_class.types.each_value do |type|
      next if type.graphql_name.start_with?("__") || BUILT_IN_SCALARS.include?(type.graphql_name)

      missing << type.graphql_name if type.description.blank?
      type.fields.each_value { |field| missing.concat(undocumented_field(type, field)) } if type.respond_to?(:fields)
      type.arguments.each_value { |input| missing << "#{type.graphql_name}.#{input.graphql_name}" if input.description.blank? } if type.kind.input_object?
      type.values.each_value { |value| missing << "#{type.graphql_name}.#{value.graphql_name}" if value.description.blank? } if type.kind.enum?
    end
    missing
  end

  def undocumented_field(type, field)
    path = "#{type.graphql_name}.#{field.graphql_name}"
    missing = field.description.blank? ? [ path ] : []
    field.arguments.each_value { |argument| missing << "#{path}(#{argument.graphql_name})" if argument.description.blank? }
    missing
  end

  it "describes every type, field, argument, input field and enum value" do
    expect(undocumented_elements).to eq([])
  end
end
