# Renders workspace-editable message templates with Liquid.
#
# Liquid never evaluates Ruby, and strict mode rejects unknown variables and
# filters, so a manager can customise wording without being able to reach
# anything beyond the allow-listed values below.
#
# Templates are rendered on every save and on every preview keystroke, so they
# must also be cheap. Only branching tags are available (no loops, assignment,
# captures or includes), range literals are refused before parsing, and Liquid's
# render score caps whatever work is left.
class MessageRenderer
  ENVIRONMENT = Liquid::Environment.build(
    tags: Liquid::Tags::STANDARD_TAGS.slice("if", "unless", "case", "comment", "#", "raw"),
    error_mode: :strict
  ) do |environment|
    environment.default_resource_limits = {
      render_length_limit: 20_000, render_score_limit: 2_000, assign_score_limit: 2_000
    }
  end

  # Longest subject and body a template may have; previews refuse anything longer before parsing.
  MAX_SUBJECT_LENGTH = 160
  MAX_BODY_LENGTH = 5_000
  TAG_OPENING = /\{[{%]/
  private_constant :TAG_OPENING

  DEFAULTS = {
    "booking_confirmed" => {
      subject: "Booked: {{ machine.name }} on {{ booking.date }}",
      body: <<~LIQUID
        Hi {{ member.name }},

        Your booking for the {{ machine.name }} at {{ workspace.name }} is confirmed.

        When: {{ booking.date }}, {{ booking.starts_at }} to {{ booking.ends_at }}

        Please let the front desk know when you arrive.
      LIQUID
    },
    "booking_cancelled" => {
      subject: "Cancelled: {{ machine.name }} on {{ booking.date }}",
      body: <<~LIQUID
        Hi {{ member.name }},

        Your booking for the {{ machine.name }} at {{ workspace.name }} on {{ booking.date }},
        {{ booking.starts_at }} to {{ booking.ends_at }}, has been cancelled.
      LIQUID
    }
  }.freeze

  SAMPLE = {
    "member" => { "name" => "Robin Example" },
    "machine" => { "name" => "Laser cutter" },
    "workspace" => { "name" => "Sample Makerspace" },
    "booking" => { "date" => "Sunday 18 October", "starts_at" => "14:00", "ends_at" => "15:00" }
  }.freeze

  Rendered = Data.define(:subject, :body, :used_fallback, :problems)

  # Problems that would stop a template from rendering, checked against sample values.
  #
  # @param subject [String] Liquid source.
  # @param body [String] Liquid source.
  # @return [Array<String>] readable problems; empty when the template is valid.
  # @example
  #   MessageRenderer.check(subject: "Hi {{ member.nme }}", body: "x")
  #   # => ["undefined variable nme"]
  def self.check(subject:, body:)
    [ subject, body ].flat_map { |source| render_source(source, SAMPLE).last }.uniq
  end

  # The allow-listed values a template may use, for one booking.
  #
  # @param booking [Booking]
  # @return [Hash{String => Hash}] member, machine, workspace and booking values,
  #   with dates and times in the workspace's zone.
  def self.variables_for(booking)
    zone = booking.workspace.zone
    {
      "member" => { "name" => booking.membership.user.name },
      "machine" => { "name" => booking.machine.name },
      "workspace" => { "name" => booking.workspace.name },
      "booking" => {
        "date" => booking.starts_at.in_time_zone(zone).strftime("%A %-d %B"),
        "starts_at" => booking.starts_at.in_time_zone(zone).strftime("%H:%M"),
        "ends_at" => booking.ends_at.in_time_zone(zone).strftime("%H:%M")
      }
    }
  end

  # Renders the workspace's template, falling back to the built-in default if it fails.
  #
  # @param kind [String] a message kind (a key of {DEFAULTS}).
  # @param template [MessageTemplate, nil] the saved or draft template; nil uses the default.
  # @param variables [Hash] from {variables_for} or {SAMPLE}.
  # @return [Rendered] subject, body, whether the fallback was used, and the problems found.
  def self.render(kind:, template:, variables:)
    if template
      subject, subject_problems = render_source(template.subject, variables)
      body, body_problems = render_source(template.body, variables)
      problems = subject_problems + body_problems
      return Rendered.new(subject: subject.strip, body: body, used_fallback: false, problems: []) if problems.empty?
    end

    default = DEFAULTS.fetch(kind)
    Rendered.new(
      subject: render_source(default[:subject], variables).first.strip,
      body: render_source(default[:body], variables).first,
      used_fallback: template.present?,
      problems: problems || []
    )
  end

  # @return [Array(String, Array<String>)] the output and the problems found.
  # Whether any `{{ … }}` or `{% … %}` contains `..`, the range syntax. Ranges such
  # as (1..999999999) could make a filter like `join` build a huge string.
  #
  # A single forward pass: each tag is searched once for its closing delimiter,
  # so the cost grows linearly with the source (a backtracking regular
  # expression here was quadratic in the number of unclosed tags).
  #
  # @param source [String] Liquid source.
  # @return [Boolean]
  # @example
  #   MessageRenderer.range_in_markup?("{{ (1..5) | join }}") # => true
  #   MessageRenderer.range_in_markup?("Opens 9..5")          # => false
  def self.range_in_markup?(source)
    position = 0
    while (opening = source.index(TAG_OPENING, position))
      closing = source.index(source[opening + 1] == "{" ? "}}" : "%}", opening + 2) || source.length
      return true if source[(opening + 2)...closing].include?("..")

      position = closing + 2
    end
    false
  end

  # @return [Array(String, Array<String>)] the output and the problems found.
  def self.render_source(source, variables)
    return [ "", [ "Ranges such as (1..5) are not available in message templates." ] ] if range_in_markup?(source)

    template = Liquid::Template.parse(source, environment: ENVIRONMENT)
    output = template.render(variables, strict_variables: true, strict_filters: true)
    [ output, template.errors.map { |error| error.message.delete_prefix("Liquid error: ") } ]
  rescue Liquid::Error => error
    [ "", [ error.message.sub(/\ALiquid (syntax )?error: /i, "") ] ]
  end
  private_class_method :render_source
end
