require "rails_helper"
require "rake"

RSpec.describe "booking_kiosk rake tasks" do
  before(:all) { Rails.application.load_tasks if Rake::Task.tasks.empty? }

  it "lapses expired holds, drops expired invitations and delivers messages whose retry is due" do
    booking = create(:booking)
    stale = create(:booking, machine: booking.machine, status: "held", starts_at: booking.starts_at + 1.hour)
    stale.update_columns(hold_expires_at: 1.minute.ago)
    due = Messages::Enqueue.call(booking: booking, kind: "booking_confirmed")
    due.update_columns(next_attempt_at: 2.minutes.ago)
    waiting = Messages::Enqueue.call(booking: booking, kind: "booking_cancelled")
    waiting.update_columns(next_attempt_at: 3.minutes.from_now)
    Invitation.issue!(create(:membership, workspace: booking.workspace, role: "staff"), now: now - Invitation::LIFETIME)
    Invitation.issue!(create(:membership, workspace: booking.workspace, role: "staff"))

    expect { Rake::Task["booking_kiosk:tick"].execute }.to output(
      /lapsed 1 holds, deleted 1 expired invitations, delivered 1 pending messages/
    ).to_stdout
    expect(Invitation.count).to eq(1)
    expect(stale.reload).to be_lapsed
    expect(due.reload).to be_delivered
    expect(waiting.reload).to be_pending
  end

  it "keeps schema.graphql in sync with the code (run bin/rails booking_kiosk:schema:dump)" do
    expect(Rails.root.join("schema.graphql").read).to eq(BookingKioskSchema.to_definition)
  end
end
