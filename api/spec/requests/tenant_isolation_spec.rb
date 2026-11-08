require "rails_helper"

# A member, staff person or manager of one workspace must never read or change
# another workspace's data, whatever IDs or headers they send.
RSpec.describe "Tenant isolation through the API" do
  let(:home) { create(:workspace, slug: "home") }
  let(:away) { create(:workspace, slug: "away") }
  let(:away_machine) { create(:machine, workspace: away, name: "Away lathe") }
  let(:away_booking) { create(:booking, machine: away_machine, starts_at: away.zone.local(2026, 3, 10, 15)) }
  let(:intruder) { create(:user) }

  def intrude_as(role)
    create(:membership, workspace: home, user: intruder, role: role)
    away_booking
    sign_in_as(intruder)
  end

  it "returns no workspace for a slug the viewer does not belong to, whatever the header says" do
    intrude_as("manager")
    by_header = graphql("{ workspace(slug: \"away\") { name machines { name } } }", workspace: "away")
    mixed = graphql("{ workspace(slug: \"away\") { name machines { name } } }", workspace: "home")
    expect(by_header.dig("data", "workspace")).to be_nil
    expect(mixed.dig("data", "workspace")).to be_nil
  end

  it "does not let a member hold another workspace's machine by ID" do
    intrude_as("member")
    body = graphql(<<~GQL, variables: { id: away_machine.id }, workspace: "home")
      mutation($id: ID!) { placeHold(machineId: $id, startsAt: "2026-03-11T10:00:00Z") { booking { id } errors { code } } }
    GQL
    expect(body.dig("data", "placeHold", "errors", 0, "code")).to eq("NOT_FOUND")
    expect(away.bookings.count).to eq(1)
  end

  it "does not let staff mark arrivals in another workspace" do
    intrude_as("staff")
    body = graphql(<<~GQL, variables: { id: away_booking.id }, workspace: "home")
      mutation($id: ID!) { markArrival(bookingId: $id, arrived: true) { errors { code } } }
    GQL
    expect(body.dig("data", "markArrival", "errors", 0, "code")).to eq("NOT_FOUND")
    expect(away_booking.reload.arrived_at).to be_nil
  end

  it "does not let a manager cancel bookings or retire machines elsewhere" do
    intrude_as("manager")
    cancel = graphql(<<~GQL, variables: { id: away_booking.id }, workspace: "home")
      mutation($id: ID!) { cancelBooking(bookingId: $id) { errors { code } } }
    GQL
    retire = graphql(<<~GQL, variables: { id: away_machine.id }, workspace: "home")
      mutation($id: ID!) { retireMachine(machineId: $id) { errors { code } } }
    GQL
    expect(cancel.dig("data", "cancelBooking", "errors", 0, "code")).to eq("NOT_FOUND")
    expect(retire.dig("data", "retireMachine", "errors", 0, "code")).to eq("NOT_FOUND")
    expect(away_booking.reload).to be_confirmed
    expect(away_machine.reload).not_to be_retired
  end

  it "never shows another workspace's bookings in the day sheet, outbox or utilisation" do
    intrude_as("manager")
    Messages::Enqueue.call(booking: away_booking, kind: "booking_confirmed")
    body = graphql("{ workspace(slug: \"home\") { daySheet { id } outbox { nodes { id } } utilisation { machine { name } } } }", workspace: "home")
    expect(body.dig("data", "workspace")).to eq("daySheet" => [], "outbox" => { "nodes" => [] }, "utilisation" => [])
  end

  it "does not reveal another workspace's availability" do
    intrude_as("member")
    body = graphql('{ workspace(slug: "home") { availability(date: "2026-03-10") { machine { name } } } }', workspace: "home")
    expect(body.dig("data", "workspace", "availability")).to eq([])
  end

  it "treats SQL-shaped IDs, slugs and headers as plain values" do
    intrude_as("manager")
    payloads = [ "' OR '1'='1", "#{away_booking.id}' OR 1=1 --", "x'); DROP TABLE bookings; --" ]
    payloads.each do |payload|
      cancel = graphql("mutation($id: ID!) { cancelBooking(bookingId: $id) { errors { code } } }", variables: { id: payload }, workspace: "home")
      expect(cancel.dig("data", "cancelBooking", "errors", 0, "code")).to eq("NOT_FOUND")
      by_slug = graphql("query($s: String!) { workspace(slug: $s) { name } }", variables: { s: payload }, workspace: payload)
      expect(by_slug).to eq("data" => { "workspace" => nil })
    end
    expect(away_booking.reload).to be_confirmed
    expect(Booking.count).to eq(1)
  end

  it "scopes each workspace field to its own slug, even when one request names two workspaces" do
    intrude_as("member")
    create(:membership, workspace: away, user: intruder, role: "member")
    away_machine
    body = graphql('{ home: workspace(slug: "home") { machines { name } } away: workspace(slug: "away") { machines { name } } }', workspace: "home")
    expect(body["data"]).to eq("home" => { "machines" => [] }, "away" => { "machines" => [ { "name" => "Away lathe" } ] })
  end
end
