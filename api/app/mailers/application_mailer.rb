# Base mailer. The sender comes from MAIL_FROM.
class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAIL_FROM", "Booking Kiosk <no-reply@booking-kiosk.example.com>")
end
