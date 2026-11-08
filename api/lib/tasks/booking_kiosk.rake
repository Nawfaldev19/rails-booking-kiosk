# Booking Kiosk's own rake tasks.
#
# booking_kiosk:tick is the periodic housekeeping job (every minute in Docker Compose).
# Correctness never depends on it: expired holds are ignored by every query and
# messages are delivered after commit. It keeps statuses tidy, deletes expired
# invitations and retries due outbox messages, at most 100 per run, oldest due first.
#
# booking_kiosk:schema:dump writes the committed SDL that the web code generator reads.
namespace :booking_kiosk do
  desc "Housekeeping: lapse expired holds, drop expired invitations, deliver messages whose retry is due. Run every minute."
  task tick: :environment do
    now = Time.current
    lapsed = Bookings::LapseExpiredHolds.call(now: now)
    expired_invitations = Invitation.expired(now).delete_all
    due = OutboundMessage.due(now).order(:next_attempt_at, :created_at).limit(100).pluck(:id)
    delivered = due.count { |id| Messages::Deliver.call(id, now: now) == :delivered }
    Rails.logger.info({ msg: "booking_kiosk_tick", lapsed_holds: lapsed, expired_invitations: expired_invitations,
                        delivered_retries: delivered }.to_json)
    puts "lapsed #{lapsed} holds, deleted #{expired_invitations} expired invitations, delivered #{delivered} pending messages"
  end
end

namespace :booking_kiosk do
  namespace :schema do
    desc "Write the GraphQL schema (SDL) to schema.graphql for the web clients' code generator"
    task dump: :environment do
      Rails.root.join("schema.graphql").write(BookingKioskSchema.to_definition)
      puts "wrote schema.graphql"
    end
  end
end
