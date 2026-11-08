module Messages
  # Renders a message and records it in the outbox. Must be called inside the
  # transaction that makes the change the message is about.
  class Enqueue
    # @param booking [Booking]
    # @param kind [String] a message kind.
    # @return [OutboundMessage] the pending outbox entry, already rendered.
    def self.call(booking:, kind:)
      template = booking.workspace.message_templates.find_by(kind: kind)
      rendered = MessageRenderer.render(kind: kind, template: template, variables: MessageRenderer.variables_for(booking))
      if rendered.used_fallback
        Rails.logger.warn({ msg: "message_template_fallback", workspace_id: booking.workspace_id, kind: kind,
                            problems: rendered.problems }.to_json)
      end

      booking.workspace.outbound_messages.create!(
        booking: booking,
        kind: kind,
        recipient: booking.membership.user.email,
        subject: rendered.subject,
        body: rendered.body,
        used_fallback_template: rendered.used_fallback
      )
    end

    # Records the invitation for a new account. Its wording is fixed (not a
    # workspace template) because it carries the set-password link. The token
    # goes in the URL fragment, which browsers never send to a server or put
    # in a Referer header.
    #
    # @param membership [Membership] the invited person's new membership.
    # @param token [String] the raw token from {Invitation.issue!}.
    # @return [OutboundMessage] the pending outbox entry.
    def self.invitation(membership:, token:)
      workspace = membership.workspace
      link = "#{Rails.application.config.x.member_app_url}/invitation#token=#{token}"
      workspace.outbound_messages.create!(
        kind: "invitation",
        recipient: membership.user.email,
        subject: "You're invited to #{workspace.name} on Booking Kiosk",
        body: <<~TEXT
          Hi #{membership.user.name},

          You have been added to #{workspace.name} on Booking Kiosk as #{membership.role}.
          Choose your password here to start:

          #{link}

          The link works once and expires in #{Invitation::LIFETIME.in_hours.to_i} hours. If you did not expect
          this message, you can ignore it.
        TEXT
      )
    end
  end
end
