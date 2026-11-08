require "rails_helper"

# These specs talk to the database below the model layer on purpose: the
# guarantees must hold even for code that skips validations.
RSpec.describe "Database constraints" do
  let(:workspace) { create(:workspace) }
  let(:machine) { create(:machine, workspace: workspace) }
  let(:membership) { create(:membership, workspace: workspace) }
  let(:starts) { local_time(workspace, 2026, 3, 11, 10) }

  def insert_booking(status:, from: starts, to: starts + 1.hour, machine_id: machine.id, membership_id: membership.id, workspace_id: workspace.id)
    Booking.insert_all!([ {
      workspace_id: workspace_id, machine_id: machine_id, membership_id: membership_id, status: status,
      period: from...to, hold_expires_at: status == "held" ? 1.hour.from_now : nil
    } ])
  end

  describe "bookings_no_overlap" do
    it "rejects a second active booking that overlaps the first" do
      insert_booking(status: "confirmed")
      expect { insert_booking(status: "held", from: starts + 30.minutes, to: starts + 90.minutes) }
        .to raise_error(ActiveRecord::ExclusionViolation)
    end

    it "allows back-to-back slots, because ranges are half-open" do
      insert_booking(status: "confirmed")
      expect { insert_booking(status: "confirmed", from: starts + 1.hour, to: starts + 2.hours) }.not_to raise_error
    end

    it "ignores released, lapsed and cancelled bookings" do
      %w[released lapsed cancelled].each { |status| insert_booking(status: status) }
      expect { insert_booking(status: "confirmed") }.not_to raise_error
    end

    it "only applies within one machine" do
      insert_booking(status: "confirmed")
      other = create(:machine, workspace: workspace)
      expect { insert_booking(status: "confirmed", machine_id: other.id) }.not_to raise_error
    end
  end

  describe "composite tenant keys" do
    let(:other_workspace) { create(:workspace) }

    it "refuses a booking whose machine belongs to another workspace" do
      foreign_machine = create(:machine, workspace: other_workspace)
      expect { insert_booking(status: "confirmed", machine_id: foreign_machine.id) }
        .to raise_error(ActiveRecord::InvalidForeignKey)
    end

    it "refuses a booking whose member belongs to another workspace" do
      foreign_member = create(:membership, workspace: other_workspace)
      expect { insert_booking(status: "confirmed", membership_id: foreign_member.id) }
        .to raise_error(ActiveRecord::InvalidForeignKey)
    end

    it "refuses moving an existing booking into another workspace" do
      booking = create(:booking, machine: machine, membership: membership)
      expect { Booking.where(id: booking.id).update_all(workspace_id: other_workspace.id) }
        .to raise_error(ActiveRecord::InvalidForeignKey)
    end
  end

  describe "check constraints" do
    it "requires holds to carry an expiry" do
      expect {
        Booking.insert_all!([ { workspace_id: workspace.id, machine_id: machine.id, membership_id: membership.id,
                                status: "held", period: starts...(starts + 1.hour), hold_expires_at: nil } ])
      }.to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects unknown statuses" do
      expect { insert_booking(status: "teleported") }.to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects empty periods" do
      expect { insert_booking(status: "confirmed", to: starts) }.to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects slot lengths other than 30 or 60 minutes" do
      expect { machine.update_columns(slot_minutes: 45) }.to raise_error(ActiveRecord::CheckViolation)
    end
  end

  describe "outbound_messages" do
    let(:booking) { create(:booking) }
    let(:message) { Messages::Enqueue.call(booking: booking, kind: "booking_confirmed") }

    it "requires a booking for booking messages" do
      expect { message.update_columns(booking_id: nil) }.to raise_error(ActiveRecord::CheckViolation)
    end

    it "refuses a booking on an invitation" do
      expect { message.update_columns(kind: "invitation") }.to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects unknown kinds" do
      expect { message.update_columns(kind: "newsletter") }.to raise_error(ActiveRecord::CheckViolation)
    end
  end

  describe "invitations" do
    it "go when their membership is deleted" do
      membership = create(:membership, role: "staff")
      Invitation.issue!(membership)
      Membership.where(id: membership.id).delete_all
      expect(Invitation.count).to eq(0)
    end

    it "cannot point at a membership in another workspace" do
      Invitation.issue!(create(:membership, role: "staff"))
      other = create(:workspace)
      expect {
        ActiveRecord::Base.connection.execute("UPDATE invitations SET workspace_id = '#{other.id}'")
      }.to raise_error(ActiveRecord::InvalidForeignKey)
    end
  end
end
