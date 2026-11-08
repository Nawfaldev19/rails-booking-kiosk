# Sends the already-rendered text of an outbox message. Rendering happens when
# the message is recorded, so a template edited later never changes a sent message.
class MessageMailer < ApplicationMailer
  # @param message [OutboundMessage]
  # @return [Mail::Message] a plain-text email.
  def outbound(message)
    mail(to: message.recipient, subject: message.subject) do |format|
      format.text { render plain: message.body }
    end
  end
end
