require "rails_helper"

# Real parallel requests need real commits, so this file runs outside the
# usual per-test transaction and cleans up after itself. The clock is pinned
# (see spec/support/pinned_clock.rb), and the time stub applies to every thread.
RSpec.describe "Concurrent requests", :concurrency do
  self.use_transactional_tests = false

  after do
    ActiveRecord::Base.connection.execute(
      "TRUNCATE outbound_messages, message_templates, invitations, bookings, machines, memberships, users, workspaces CASCADE"
    )
  end

  let(:workspace) { create(:workspace, max_active_holds: 10) }
  let(:machine) { create(:machine, workspace: workspace) }
  let(:starts_at) { workspace.zone.local(2026, 3, 11, 10) }

  def race(contenders, &attempt)
    gate = Concurrent::CountDownLatch.new(1)
    threads = contenders.map do |contender|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          gate.wait
          attempt.call(contender)
        rescue DomainError => error
          error.code
        end
      end
    end
    gate.count_down
    threads.map(&:value)
  end

  def place_hold(tenant, at = starts_at, target = machine)
    Bookings::PlaceHold.new(tenant: tenant, machine_id: target.id, starts_at: at).call
    :ok
  end

  it "lets exactly one of eight simultaneous members hold the same slot" do
    tenants = Array.new(8) { tenant_for(workspace: workspace) }
    outcomes = race(tenants) { |tenant| place_hold(tenant) }

    expect(outcomes.count(:ok)).to eq(1)
    expect(outcomes - [ :ok ]).to all(eq("SLOT_TAKEN"))
    expect(Booking.where(machine: machine).occupying.count).to eq(1)
  end

  it "never lets one member exceed the hold limit with parallel requests" do
    workspace.update!(max_active_holds: 2)
    member = tenant_for(workspace: workspace)
    outcomes = race(Array.new(6) { |i| [ member, i ] }) { |(tenant, i)| place_hold(tenant, starts_at + i.hours) }

    expect(outcomes.count(:ok)).to eq(2)
    expect(outcomes - [ :ok ]).to all(eq("HOLD_LIMIT_REACHED"))
  end

  it "keeps a confirmed booking exclusive while others race to hold it" do
    owner = tenant_for(workspace: workspace)
    held = Bookings::PlaceHold.new(tenant: owner, machine_id: machine.id, starts_at: starts_at).call
    Bookings::Confirm.new(tenant: owner, booking_id: held.id).call

    outcomes = race(Array.new(5) { tenant_for(workspace: workspace) }) { |tenant| place_hold(tenant) }
    expect(outcomes).to all(eq("SLOT_TAKEN"))
  end

  it "never leaves a hold on a machine that a manager retired at the same moment" do
    manager = tenant_for(workspace: workspace, role: "manager")
    members = Array.new(4) { tenant_for(workspace: workspace) }
    retire = "mutation($id: ID!) { retireMachine(machineId: $id) { errors { code } } }"

    5.times do
      target = create(:machine, workspace: workspace)
      contenders = [ :retire, *members.each_with_index.map { |tenant, i| [ tenant, i ] } ]
      outcomes = race(contenders) do |contender|
        if contender == :retire
          result = BookingKioskSchema.execute(retire, variables: { "id" => target.id },
            context: { current_user: manager.membership.user, tenant: manager })
          result.dig("data", "retireMachine", "errors", 0, "code") || :retired
        else
          tenant, i = contender
          place_hold(tenant, starts_at + i.hours, target)
        end
      end

      target.reload
      if target.retired?
        expect(target.bookings.occupying).to be_empty
        expect(outcomes - [ :retired ]).to all(eq("MACHINE_RETIRED"))
      else
        expect(outcomes.first).to eq("INVALID_STATE")
        expect(outcomes.drop(1)).to all(eq(:ok))
      end
    end
  end

  it "sends a message once when two workers race to deliver it" do
    booking = create(:booking, machine: machine)
    message = Messages::Enqueue.call(booking: booking, kind: "booking_confirmed")
    ActionMailer::Base.deliveries.clear

    outcomes = race([ 1, 2 ]) { Messages::Deliver.call(message.id) }

    expect(outcomes).to contain_exactly(:delivered, :skipped)
    expect(ActionMailer::Base.deliveries.size).to eq(1)
    expect(message.reload).to have_attributes(status: "delivered", attempts: 1)
  end

  it "never lets two managers demote each other at the same moment" do
    first = tenant_for(workspace: workspace, role: "manager")
    second = tenant_for(workspace: workspace, role: "manager")
    outcomes = race([ [ first, second ], [ second, first ] ]) do |(actor, target)|
      Teams::ChangeRole.new(tenant: actor, membership_id: target.membership.id, role: "staff").call
      :ok
    end

    expect(outcomes).to contain_exactly(:ok, "FORBIDDEN")
    expect(workspace.memberships.manager.count).to eq(1)
  end
end
