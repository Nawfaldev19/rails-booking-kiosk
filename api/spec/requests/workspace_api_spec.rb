require "rails_helper"

RSpec.describe "Workspace API" do
  let(:workspace) { create(:workspace, slug: "larkspur") }
  let(:laser) { create(:machine, workspace: workspace, name: "Laser cutter") }

  def signed_in(role)
    user = create(:user)
    create(:membership, workspace: workspace, user: user, role: role)
    sign_in_as(user)
    user
  end

  describe "booking flow" do
    it "holds, confirms and lists a booking, then cancels it" do
      signed_in("member")
      held = graphql(<<~GQL, variables: { id: laser.id, at: "2026-03-11T10:00:00Z" }, workspace: "larkspur")
        mutation($id: ID!, $at: ISO8601DateTime!) {
          placeHold(machineId: $id, startsAt: $at) { booking { id status holdExpiresAt machine { name } } errors { code } }
        }
      GQL
      booking = held.dig("data", "placeHold", "booking")
      expect(booking).to include("status" => "HELD", "holdExpiresAt" => "2026-03-10T12:05:00Z")

      confirmed = graphql(<<~GQL, variables: { id: booking["id"] }, workspace: "larkspur")
        mutation($id: ID!) { confirmBooking(bookingId: $id) { booking { status member { name } } errors { code } } }
      GQL
      expect(confirmed.dig("data", "confirmBooking", "booking", "status")).to eq("CONFIRMED")

      list = graphql("{ workspace(slug: \"larkspur\") { myBookings { nodes { id status } pageInfo { hasNextPage } } } }", workspace: "larkspur")
      expect(list.dig("data", "workspace", "myBookings", "nodes")).to eq([ { "id" => booking["id"], "status" => "CONFIRMED" } ])

      cancelled = graphql(<<~GQL, variables: { id: booking["id"] }, workspace: "larkspur")
        mutation($id: ID!) { cancelBooking(bookingId: $id) { booking { status } errors { code } } }
      GQL
      expect(cancelled.dig("data", "cancelBooking", "booking", "status")).to eq("CANCELLED")
    end

    it "releases a hold and lists past bookings separately" do
      user = signed_in("member")
      membership = user.memberships.first
      create(:booking, machine: laser, membership: membership, starts_at: workspace.zone.local(2026, 3, 9, 10))
      past = graphql("{ workspace(slug: \"larkspur\") { myBookings(upcoming: false) { nodes { startsAt } } } }", workspace: "larkspur")
      expect(past.dig("data", "workspace", "myBookings", "nodes").size).to eq(1)

      hold = Bookings::PlaceHold.new(tenant: Tenant.new(workspace: workspace, membership: membership),
        machine_id: laser.id, starts_at: workspace.zone.local(2026, 3, 11, 12)).call
      body = graphql(<<~GQL, variables: { id: hold.id }, workspace: "larkspur")
        mutation($id: ID!) { releaseHold(bookingId: $id) { booking { status } errors { code } } }
      GQL
      expect(body.dig("data", "releaseHold", "booking", "status")).to eq("RELEASED")
    end

    it "lists open holds separately and hides expired ones everywhere" do
      user = signed_in("member")
      tenant = Tenant.new(workspace: workspace, membership: user.memberships.first)
      place = ->(hour) { Bookings::PlaceHold.new(tenant: tenant, machine_id: laser.id, starts_at: workspace.zone.local(2026, 3, 11, hour)).call }
      stale = place.call(10)
      stale.update_columns(hold_expires_at: 1.minute.ago)
      fresh = place.call(11)

      body = graphql(<<~GQL, workspace: "larkspur")
        { serverTime workspace(slug: "larkspur") { bookingHorizonDays myHolds { id status } myBookings { nodes { id status } } } }
      GQL
      data = body.dig("data", "workspace")
      expect(body.dig("data", "serverTime")).to eq("2026-03-10T12:00:00Z")
      expect(data["bookingHorizonDays"]).to eq(14)
      expect(data["myHolds"]).to eq([ { "id" => fresh.id, "status" => "HELD" } ])
      expect(data.dig("myBookings", "nodes")).to eq([ { "id" => fresh.id, "status" => "HELD" } ])

      confirm = graphql("mutation($id: ID!) { confirmBooking(bookingId: $id) { booking { id } errors { code } } }",
        variables: { id: stale.id }, workspace: "larkspur")
      expect(confirm.dig("data", "confirmBooking", "errors", 0, "code")).to eq("HOLD_EXPIRED")
      released = graphql("mutation($id: ID!) { releaseHold(bookingId: $id) { booking { status } errors { code } } }",
        variables: { id: fresh.id }, workspace: "larkspur")
      expect(released.dig("data", "releaseHold", "booking", "status")).to eq("RELEASED")
      expect(graphql('{ workspace(slug: "larkspur") { myHolds { id } } }', workspace: "larkspur").dig("data", "workspace", "myHolds")).to eq([])
    end

    it "reports a stored hold past its expiry as LAPSED" do
      booking = create(:booking, machine: laser, status: "held", starts_at: workspace.zone.local(2026, 3, 11, 10))
      booking.update_columns(hold_expires_at: 1.second.ago)
      expect(Types::BookingType.authorized_new(booking, GraphQL::Query.new(BookingKioskSchema, "{ __typename }").context).status).to eq("lapsed")
    end

    it "refuses fractional-second starts and dates past the horizon" do
      signed_in("member")
      codes = [ "2026-03-11T10:00:00.500Z", "2030-01-15T10:00:00Z" ].map do |at|
        graphql("mutation($id: ID!, $at: ISO8601DateTime!) { placeHold(machineId: $id, startsAt: $at) { booking { id } errors { code } } }",
          variables: { id: laser.id, at: at }, workspace: "larkspur").dig("data", "placeHold", "errors", 0, "code")
      end
      expect(codes).to eq(%w[MISALIGNED_SLOT INVALID_INPUT])
      expect(workspace.bookings.count).to eq(0)
    end

    it "returns the slot grid with times in the workspace's zone" do
      laser
      signed_in("member")
      body = graphql('{ workspace(slug: "larkspur") { today timeZone opensAt closesAt availability(date: "2026-03-11") { machine { name } slots { startsAt state } } } }', workspace: "larkspur")
      workspace_data = body.dig("data", "workspace")
      expect(workspace_data).to include("today" => "2026-03-10", "timeZone" => "Europe/London", "opensAt" => "09:00", "closesAt" => "21:00")
      expect(workspace_data.dig("availability", 0, "slots", 0)).to eq("startsAt" => "2026-03-11T09:00:00+00:00", "state" => "FREE")
    end

    it "surfaces query-level domain errors with a code" do
      signed_in("member")
      body = graphql('{ workspace(slug: "larkspur") { availability(date: "2027-01-01") { machine { name } } } }', workspace: "larkspur")
      expect(body.dig("errors", 0, "extensions", "code")).to eq("INVALID_INPUT")
    end
  end

  describe "front desk" do
    it "shows today's confirmed bookings to staff with a constant number of queries" do
      signed_in("staff")
      create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 3, 10, 14))
      query = "{ workspace(slug: \"larkspur\") { daySheet { startsAt arrivedAt machine { name } member { name } } } }"
      graphql(query, workspace: "larkspur")
      one = count_queries { graphql(query, workspace: "larkspur") }
      3.times { |i| create(:booking, machine: create(:machine, workspace: workspace), starts_at: workspace.zone.local(2026, 3, 10, 15 + i)) }
      four = count_queries { graphql(query, workspace: "larkspur") }
      expect(four).to eq(one)
      sheet = graphql(query, workspace: "larkspur").dig("data", "workspace", "daySheet")
      expect(sheet.size).to eq(4)
    end

    it "hides the day sheet from members" do
      signed_in("member")
      body = graphql("{ workspace(slug: \"larkspur\") { daySheet { id } } }", workspace: "larkspur")
      expect(body.dig("errors", 0, "extensions", "code")).to eq("FORBIDDEN")
    end

    it "lets staff mark arrival" do
      signed_in("staff")
      booking = create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 3, 10, 14))
      body = graphql(<<~GQL, variables: { id: booking.id }, workspace: "larkspur")
        mutation($id: ID!) { markArrival(bookingId: $id, arrived: true) { booking { arrivedAt } errors { code } } }
      GQL
      expect(body.dig("data", "markArrival", "booking", "arrivedAt")).to eq("2026-03-10T12:00:00Z")
    end
  end

  describe "management" do
    it "creates, updates and retires machines" do
      signed_in("manager")
      created = graphql('mutation { createMachine(name: " Router ", slotMinutes: 30) { machine { id name slotMinutes } errors { code } } }', workspace: "larkspur")
      id = created.dig("data", "createMachine", "machine", "id")
      expect(created.dig("data", "createMachine", "machine")).to include("name" => "Router", "slotMinutes" => 30)

      updated = graphql(<<~GQL, variables: { id: id }, workspace: "larkspur")
        mutation($id: ID!) { updateMachine(machineId: $id, description: "Big", slotMinutes: 60) { machine { description slotMinutes } errors { code } } }
      GQL
      expect(updated.dig("data", "updateMachine", "machine")).to eq("description" => "Big", "slotMinutes" => 60)

      retired = graphql("mutation($id: ID!) { retireMachine(machineId: $id) { machine { retired } errors { code } } }", variables: { id: id }, workspace: "larkspur")
      expect(retired.dig("data", "retireMachine", "machine", "retired")).to be(true)
      listed = graphql("{ workspace(slug: \"larkspur\") { machines { name } all: machines(includeRetired: true) { name } } }", workspace: "larkspur")
      expect(listed.dig("data", "workspace", "machines")).to eq([])
      expect(listed.dig("data", "workspace", "all")).to eq([ { "name" => "Router" } ])
    end

    it "treats a null description as an empty one instead of failing" do
      signed_in("manager")
      created = graphql('mutation { createMachine(name: "Saw", description: null, slotMinutes: 60) { machine { id description } errors { code } } }', workspace: "larkspur")
      expect(created.dig("data", "createMachine")).to include("machine" => include("description" => ""), "errors" => [])
      id = created.dig("data", "createMachine", "machine", "id")
      graphql('mutation($id: ID!) { updateMachine(machineId: $id, description: "Fast") { errors { code } } }', variables: { id: id }, workspace: "larkspur")
      cleared = graphql('mutation($id: ID!) { updateMachine(machineId: $id, description: null) { machine { description } errors { code } } }', variables: { id: id }, workspace: "larkspur")
      expect(cleared.dig("data", "updateMachine")).to eq("machine" => { "description" => "" }, "errors" => [])
      unnamed = graphql('mutation($id: ID!) { updateMachine(machineId: $id, name: null) { errors { code field } } }', variables: { id: id }, workspace: "larkspur")
      expect(unnamed.dig("data", "updateMachine", "errors")).to eq([ { "code" => "INVALID_INPUT", "field" => "name" } ])
    end

    it "reports validation problems as typed field errors" do
      signed_in("manager")
      body = graphql('mutation { createMachine(name: "", slotMinutes: 45) { machine { id } errors { code field } } }', workspace: "larkspur")
      expect(body.dig("data", "createMachine", "errors")).to contain_exactly(
        { "code" => "INVALID_INPUT", "field" => "name" }, { "code" => "INVALID_INPUT", "field" => "slotMinutes" }
      )
    end

    it "will not retire a machine or change its slots while bookings are upcoming" do
      signed_in("manager")
      create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 3, 12, 10))
      retire = graphql("mutation($id: ID!) { retireMachine(machineId: $id) { errors { code } } }", variables: { id: laser.id }, workspace: "larkspur")
      resize = graphql("mutation($id: ID!) { updateMachine(machineId: $id, slotMinutes: 30) { errors { code } } }", variables: { id: laser.id }, workspace: "larkspur")
      expect(retire.dig("data", "retireMachine", "errors", 0, "code")).to eq("INVALID_STATE")
      expect(resize.dig("data", "updateMachine", "errors", 0, "code")).to eq("INVALID_STATE")
    end

    it "saves, previews and resets message templates" do
      signed_in("manager")
      preview = graphql('{ workspace(slug: "larkspur") { messagePreview(kind: BOOKING_CANCELLED, subject: "Hi {{ member.name }}", body: "{{ oops }}") { subject problems } } }', workspace: "larkspur")
      expect(preview.dig("data", "workspace", "messagePreview", "problems")).not_to be_empty
      expect(preview.dig("data", "workspace", "messagePreview", "subject")).to start_with("Cancelled: Laser cutter")

      bad = graphql('mutation { saveMessageTemplate(kind: BOOKING_CONFIRMED, subject: "{{ nope }}", body: "x") { errors { code } } }', workspace: "larkspur")
      expect(bad.dig("data", "saveMessageTemplate", "errors", 0, "code")).to eq("INVALID_INPUT")

      saved = graphql('mutation { saveMessageTemplate(kind: BOOKING_CONFIRMED, subject: "Booked {{ machine.name }}", body: "See you") { template { customised } errors { code } } }', workspace: "larkspur")
      expect(saved.dig("data", "saveMessageTemplate", "template", "customised")).to be(true)
      listed = graphql("{ workspace(slug: \"larkspur\") { messageTemplates { kind customised subject } } }", workspace: "larkspur")
      expect(listed.dig("data", "workspace", "messageTemplates")).to include({ "kind" => "BOOKING_CONFIRMED", "customised" => true, "subject" => "Booked {{ machine.name }}" })

      reset = graphql("mutation { resetMessageTemplate(kind: BOOKING_CONFIRMED) { template { customised } } }", workspace: "larkspur")
      expect(reset.dig("data", "resetMessageTemplate", "template", "customised")).to be(false)
    end

    it "refuses previews longer than a template may be, before rendering them" do
      signed_in("manager")
      expect(MessageRenderer).not_to receive(:render)
      body = graphql("query($b: String!) { workspace(slug: \"larkspur\") { messagePreview(kind: BOOKING_CONFIRMED, subject: \"x\", body: $b) { subject } } }",
        variables: { b: "{{" * 2_501 }, workspace: "larkspur")
      expect(body.dig("errors", 0, "extensions", "code")).to eq("INVALID_INPUT")
    end

    it "pages the outbox by key, so a message recorded between pages is never repeated" do
      signed_in("manager")
      booking = create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 3, 11, 10))
      5.times do |i|
        Messages::Enqueue.call(booking: booking, kind: "booking_confirmed").update_columns(created_at: now - (5 - i).minutes)
      end
      page = lambda do |after|
        graphql("query($a: String) { workspace(slug: \"larkspur\") { outbox(first: 2, after: $a) { nodes { id } pageInfo { hasNextPage endCursor } } } }",
          variables: { a: after }, workspace: "larkspur").dig("data", "workspace", "outbox")
      end

      first = page.call(nil)
      Messages::Enqueue.call(booking: booking, kind: "booking_cancelled")
      second = page.call(first.dig("pageInfo", "endCursor"))
      third = page.call(second.dig("pageInfo", "endCursor"))
      ids = [ first, second, third ].flat_map { |p| p["nodes"].map { |node| node["id"] } }
      expect(ids.size).to eq(5)
      expect(ids.uniq.size).to eq(5)
      expect(ids).to eq(OutboundMessage.newest_first.where(kind: "booking_confirmed").pluck(:id))
      expect([ first, second, third ].map { |p| p.dig("pageInfo", "hasNextPage") }).to eq([ true, true, false ])
    end

    it "rejects an outbox cursor it did not issue" do
      signed_in("manager")
      body = graphql('{ workspace(slug: "larkspur") { outbox(after: "bm9wZQ") { nodes { id } } } }', workspace: "larkspur")
      expect(body.dig("errors", 0, "extensions", "code")).to eq("INVALID_INPUT")
    end

    it "reports utilisation over the last 14 days and the outbox" do
      signed_in("manager")
      booking = create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 3, 9, 10))
      create(:booking, machine: laser, starts_at: workspace.zone.local(2026, 2, 1, 10))
      Messages::Enqueue.call(booking: booking, kind: "booking_confirmed")
      body = graphql("{ workspace(slug: \"larkspur\") { utilisation { machine { name } bookedHours bookingCount } outbox { nodes { status recipient } } } }", workspace: "larkspur")
      expect(body.dig("data", "workspace", "utilisation")).to eq([ { "machine" => { "name" => "Laser cutter" }, "bookedHours" => 1.0, "bookingCount" => 1 } ])
      expect(body.dig("data", "workspace", "outbox", "nodes", 0, "status")).to eq("PENDING")
    end

    it "shows why a message failed and lets a manager retry it" do
      signed_in("manager")
      message = Messages::Enqueue.call(booking: create(:booking, machine: laser), kind: "booking_confirmed")
      message.update_columns(status: "failed", attempts: OutboundMessage::MAX_ATTEMPTS, last_error: "Net::SMTPServerBusy: busy")
      listed = graphql('{ workspace(slug: "larkspur") { outbox { nodes { status lastError } } } }', workspace: "larkspur")
      expect(listed.dig("data", "workspace", "outbox", "nodes")).to eq([ { "status" => "FAILED", "lastError" => "Net::SMTPServerBusy: busy" } ])

      retry_message = "mutation($id: ID!) { retryMessage(messageId: $id) { message { status attempts } errors { code } } }"
      expect { graphql(retry_message, variables: { id: message.id }, workspace: "larkspur") }.to have_enqueued_job(DeliverMessageJob).with(message.id)
      expect(message.reload).to have_attributes(status: "pending", attempts: 0, next_attempt_at: now)
      again = graphql(retry_message, variables: { id: message.id }, workspace: "larkspur")
      expect(again.dig("data", "retryMessage", "errors", 0, "code")).to eq("INVALID_STATE")
    end

    it "keeps management out of reach for members" do
      signed_in("member")
      body = graphql('mutation { createMachine(name: "X", slotMinutes: 30) { errors { code } } }', workspace: "larkspur")
      expect(body.dig("data", "createMachine", "errors", 0, "code")).to eq("FORBIDDEN")
    end
  end
end
