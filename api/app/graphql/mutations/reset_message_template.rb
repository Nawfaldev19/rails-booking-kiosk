module Mutations
  # Deletes a workspace's customised template so the built-in default applies again.
  #
  # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN.
  class ResetMessageTemplate < BaseMutation
    description "Goes back to the built-in wording for a message kind. Managers only."

    argument :kind, Types::MessageKindEnum, "The message kind to reset.", required: true

    field :template, Types::MessageTemplateType, "The built-in default now in use.", null: true

    # @param kind [String]
    # @return [Hash] the payload's `template`.
    def perform(kind:)
      tenant!.authorize!(:manage_messages)
      tenant!.message_templates.where(kind: kind).delete_all
      default = MessageRenderer::DEFAULTS.fetch(kind)
      { template: { kind: kind, subject: default[:subject], body: default[:body], customised: false } }
    end
  end
end
