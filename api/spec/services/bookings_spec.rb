require "rails_helper"

RSpec.describe "Booking services" do
  # The clock is pinned to Tuesday 10 March 2026, 12:00 in London (GMT). Opening hours 09:00 to 21:00.
  let(:workspace) { create(:workspace, hold_minutes: 5, max_active_holds: 2) }
  let(:machine) { create(:machine, workspace: workspace, slot_minutes: 60) }
  let(:member) { tenant_for(workspace: workspace) }
  let(:tomorrow_10) { local_time(workspace, 2026, 3, 11, 10) }

  def hold(tenant = member, starts_at = tomorrow_10, target = machine)
    Bookings::PlaceHold.new(tenant: tenant, machine_id: target.id, starts_at: starts_at).call
  end

  def error_code
    yield
    nil
  rescue DomainError => error
    error.code
  end

  describe Bookings::PlaceHold do
    it "holds a free slot until the workspace's hold time runs out" do
      booking = hold
      expect(booking).to have_attributes(status: "held", starts_at: tomorrow_10, ends_at: tomorrow_10 + 1.hour,
        hold_expires_at: now + 5.minutes, membership: member.membership)
    end

    it "rejects a slot that someone else holds" do
      hold
      other = tenant_for(workspace: workspace)
      expect(error_code { hold(other) }).to eq("SLOT_TAKEN")
    end

    it "frees an expired hold for the next person without waiting for the sweeper" do
      first = hold
      travel 6.minutes
      second = hold(tenant_for(workspace: workspace))
      expect(second).to be_held
      expect(first.reload).to be_lapsed
    end

    it "enforces the per-member limit on open holds" do
      hold(member, tomorrow_10)
      hold(member, tomorrow_10 + 1.hour)
      expect(error_code { hold(member, tomorrow_10 + 2.hours) }).to eq("HOLD_LIMIT_REACHED")
    end

    it "validates slot alignment, opening hours and the past" do
      expect(error_code { hold(member, tomorrow_10 + 15.minutes) }).to eq("MISALIGNED_SLOT")
      expect(error_code { hold(member, local_time(workspace, 2026, 3, 11, 8)) }).to eq("OUTSIDE_OPENING_HOURS")
      expect(error_code { hold(member, local_time(workspace, 2026, 3, 11, 21)) }).to eq("OUTSIDE_OPENING_HOURS")
      expect(error_code { hold(member, local_time(workspace, 2026, 3, 10, 11)) }).to eq("SLOT_IN_PAST")
    end

    it "refuses whole-minute misses such as a start half a second past the hour" do
      expect(error_code { hold(member, tomorrow_10 + 0.5.seconds) }).to eq("MISALIGNED_SLOT")
      expect(Booking.count).to eq(0)
    end

    it "only takes holds from today up to the end of the booking horizon" do
      last_day = local_time(workspace, 2026, 3, 23, 10)
      expect(hold(member, last_day)).to be_held
      expect(error_code { hold(member, local_time(workspace, 2026, 3, 24, 10)) }).to eq("INVALID_INPUT")
      expect(error_code { hold(member, local_time(workspace, 2030, 1, 15, 10)) }).to eq("INVALID_INPUT")
    end

    it "never lets a hold outlive the start of its slot" do
      travel_to(local_time(workspace, 2026, 3, 10, 12, 58))
      booking = hold(member, local_time(workspace, 2026, 3, 10, 13))
      expect(booking.hold_expires_at).to eq(booking.starts_at)
    end

    it "accepts half-hour slots on half-hour machines" do
      printer = create(:machine, workspace: workspace, slot_minutes: 30)
      expect(hold(member, tomorrow_10 + 30.minutes, printer).ends_at).to eq(tomorrow_10 + 60.minutes)
    end

    it "refuses retired machines, other workspaces' machines and roles that cannot book" do
      retired = create(:machine, workspace: workspace, retired_at: 1.day.ago)
      foreign = create(:machine)
      expect(error_code { hold(member, tomorrow_10, retired) }).to eq("MACHINE_RETIRED")
      expect(error_code { hold(member, tomorrow_10, foreign) }).to eq("NOT_FOUND")
      expect(error_code { hold(tenant_for(workspace: workspace, role: "staff")) }).to eq("FORBIDDEN")
    end
  end

  describe Bookings::Confirm do
    it "confirms an open hold and records the message in the outbox" do
      booking = hold
      expect {
        Bookings::Confirm.new(tenant: member, booking_id: booking.id).call
      }.to change(OutboundMessage, :count).by(1).and have_enqueued_job(DeliverMessageJob)
      expect(booking.reload).to have_attributes(status: "confirmed", confirmed_at: now, hold_expires_at: nil)
    end

    it "refuses an expired hold" do
      booking = hold
      travel 5.minutes + 1.second
      expect(error_code { Bookings::Confirm.new(tenant: member, booking_id: booking.id).call }).to eq("HOLD_EXPIRED")
      expect(OutboundMessage.count).to eq(0)
    end

    it "refuses a hold whose slot has already started, even if the hold has not run out" do
      booking = create(:booking, machine: machine, membership: member.membership, status: "held",
        starts_at: local_time(workspace, 2026, 3, 10, 13))
      booking.update_columns(hold_expires_at: booking.starts_at + 10.minutes)
      travel_to(booking.starts_at + 2.minutes)
      expect(error_code { Bookings::Confirm.new(tenant: member, booking_id: booking.id).call }).to eq("SLOT_IN_PAST")
      expect(booking.reload).to be_held
    end

    it "cannot confirm someone else's hold" do
      booking = hold
      other = tenant_for(workspace: workspace)
      expect(error_code { Bookings::Confirm.new(tenant: other, booking_id: booking.id).call }).to eq("NOT_FOUND")
    end

    it "refuses to confirm twice" do
      booking = hold
      Bookings::Confirm.new(tenant: member, booking_id: booking.id).call
      expect(error_code { Bookings::Confirm.new(tenant: member, booking_id: booking.id).call }).to eq("INVALID_STATE")
    end
  end

  describe Bookings::Release do
    it "releases the member's hold so the slot is free again" do
      booking = hold
      Bookings::Release.new(tenant: member, booking_id: booking.id).call
      expect(booking.reload).to be_released
      expect(hold(tenant_for(workspace: workspace))).to be_held
    end

    it "only releases holds" do
      booking = Bookings::Confirm.new(tenant: member, booking_id: hold.id).call
      expect(error_code { Bookings::Release.new(tenant: member, booking_id: booking.id).call }).to eq("INVALID_STATE")
    end
  end

  describe Bookings::Cancel do
    let!(:booking) { Bookings::Confirm.new(tenant: member, booking_id: hold.id).call }

    it "lets the member cancel their own future booking and queues a message" do
      expect { Bookings::Cancel.new(tenant: member, booking_id: booking.id).call }
        .to change { booking.reload.status }.to("cancelled").and have_enqueued_job(DeliverMessageJob)
      expect(OutboundMessage.where(kind: "booking_cancelled").count).to eq(1)
    end

    it "lets a manager cancel anyone's booking, but not another member" do
      other = tenant_for(workspace: workspace)
      expect(error_code { Bookings::Cancel.new(tenant: other, booking_id: booking.id).call }).to eq("NOT_FOUND")
      manager = tenant_for(workspace: workspace, role: "manager")
      expect(Bookings::Cancel.new(tenant: manager, booking_id: booking.id).call).to be_cancelled
    end

    it "refuses bookings that have started and staff" do
      expect(error_code { Bookings::Cancel.new(tenant: tenant_for(workspace: workspace, role: "staff"), booking_id: booking.id).call }).to eq("FORBIDDEN")
      travel_to(tomorrow_10 + 1.minute)
      expect(error_code { Bookings::Cancel.new(tenant: member, booking_id: booking.id).call }).to eq("INVALID_STATE")
    end
  end

  describe Bookings::MarkArrival do
    let(:staff) { tenant_for(workspace: workspace, role: "staff") }

    it "marks and unmarks arrival for today's confirmed bookings" do
      today = create(:booking, machine: machine, starts_at: local_time(workspace, 2026, 3, 10, 14))
      Bookings::MarkArrival.new(tenant: staff, booking_id: today.id, arrived: true).call
      expect(today.reload.arrived_at).to eq(now)
      Bookings::MarkArrival.new(tenant: staff, booking_id: today.id, arrived: false).call
      expect(today.reload.arrived_at).to be_nil
    end

    it "decides what today is from the clock it is given, not the system clock" do
      tomorrow = create(:booking, machine: machine, starts_at: tomorrow_10)
      next_day = local_time(workspace, 2026, 3, 11, 9)
      Bookings::MarkArrival.new(tenant: staff, booking_id: tomorrow.id, arrived: true, now: next_day).call
      expect(tomorrow.reload.arrived_at).to eq(next_day)
    end

    it "refuses other days, unconfirmed bookings and members" do
      later = create(:booking, machine: machine, starts_at: tomorrow_10)
      held = create(:booking, machine: machine, status: "held", starts_at: local_time(workspace, 2026, 3, 10, 15))
      expect(error_code { Bookings::MarkArrival.new(tenant: staff, booking_id: later.id, arrived: true).call }).to eq("INVALID_STATE")
      expect(error_code { Bookings::MarkArrival.new(tenant: staff, booking_id: held.id, arrived: true).call }).to eq("INVALID_STATE")
      expect(error_code { Bookings::MarkArrival.new(tenant: member, booking_id: later.id, arrived: true).call }).to eq("FORBIDDEN")
    end
  end

  describe Bookings::Availability do
    it "reports each slot from the viewer's point of view" do
      mine = hold
      create(:booking, machine: machine, starts_at: tomorrow_10 + 2.hours)
      create(:booking, machine: machine, membership: member.membership, starts_at: tomorrow_10 + 4.hours)
      days = Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 11)).call
      states = days.first.slots.to_h { |slot| [ slot.starts_at.in_time_zone(workspace.zone).hour, slot.state ] }
      expect(states.values_at(9, 10, 12, 14)).to eq(%w[FREE HELD_BY_YOU TAKEN BOOKED_BY_YOU])
      expect(days.first.slots.find { |slot| slot.state == "HELD_BY_YOU" }.booking_id).to eq(mine.id)
      expect(days.first.slots.size).to eq(12)
    end

    it "marks started slots as past and hides retired machines" do
      machine
      create(:machine, workspace: workspace, retired_at: 1.day.ago)
      days = Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 10)).call
      expect(days.map(&:machine)).to eq([ machine ])
      expect(days.first.slots.first(3).map(&:state)).to eq(%w[PAST PAST PAST])
    end

    it "only allows today up to 13 days ahead, the booking horizon" do
      expect(error_code { Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 9)).call }).to eq("INVALID_INPUT")
      expect(error_code { Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 24)).call }).to eq("INVALID_INPUT")
    end

    it "uses the same number of queries for one machine or twenty" do
      member
      machine
      single = count_queries { Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 11)).call }
      19.times { create(:machine, workspace: workspace) }
      many = count_queries { Bookings::Availability.new(tenant: member, date: Date.new(2026, 3, 11)).call }
      expect(many).to eq(single)
    end
  end

  describe Bookings::SlotRules do
    # London changes to summer time on 29 March 2026 and back on 25 October 2026.
    it "keeps twelve slots from 09:00 local time on both daylight-saving days" do
      rules = Bookings::SlotRules.new(workspace: workspace, machine: machine)
      { Date.new(2026, 3, 29) => 8, Date.new(2026, 10, 25) => 9 }.each do |date, first_utc_hour|
        slots = rules.slots_on(date)
        labels = slots.map { |slot| slot.begin.in_time_zone(workspace.zone).strftime("%H:%M") }
        expect(slots.size).to eq(12)
        expect(labels.first(2)).to eq(%w[09:00 10:00])
        expect(labels.last).to eq("20:00")
        expect(slots.first.begin.utc.hour).to eq(first_utc_hour)
        expect(slots.map { |slot| slot.end - slot.begin }.uniq).to eq([ 1.hour ])
      end
    end
  end

  describe Bookings::LapseExpiredHolds do
    it "marks only expired holds as lapsed" do
      fresh = hold
      stale = hold(member, tomorrow_10 + 1.hour)
      stale.update_columns(hold_expires_at: 1.minute.ago)
      expect(Bookings::LapseExpiredHolds.call).to eq(1)
      expect([ fresh.reload.status, stale.reload.status ]).to eq(%w[held lapsed])
    end
  end
end
