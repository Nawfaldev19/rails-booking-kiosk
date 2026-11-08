module Mutations
  # Saves a workspace's wording for one message kind.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, INVALID_INPUT (length, syntax or unknown variables).
  #
  # @see docs/adr/0006-liquid-for-workspace-editable-templates.md
  class SaveMessageTemplate < BaseMutation
    description "Customises a message. Rejected if it uses unknown variables or invalid syntax. Managers only."

    argument :kind, Types::MessageKindEnum, "The message kind to customise.", required: true
    argument :subject, String, "Liquid source, up to 160 characters.", required: true
    argument :body, String, "Liquid source, up to 5,000 characters.", required: true

    field :template, Types::MessageTemplateType, "The saved template.", null: true

    # @param kind [String]
    # @param subject [String]
    # @param body [String]
    # @return [Hash] the payload's `template`.
    def perform(kind:, subject:, body:)
      tenant!.authorize!(:manage_messages)
      record = tenant!.message_templates.find_or_initialize_by(kind: kind)
      record.update!(subject: subject, body: body)
      { template: { kind: kind, subject: record.subject, body: record.body, customised: true } }
    end
  end
end
