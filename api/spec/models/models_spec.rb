require "rails_helper"

RSpec.describe Workspace do
  it "builds the opening window from local midnight, across a daylight-saving change" do
    workspace = build(:workspace, time_zone: "Europe/London", opens_at_minute: 9 * 60, closes_at_minute: 21 * 60)
    # Clocks go forward in London on 29 March 2026.
    window = workspace.opening_window(Date.new(2026, 3, 29))
    expect(window.begin.utc).to eq(Time.utc(2026, 3, 29, 8))
    expect(window.end.utc).to eq(Time.utc(2026, 3, 29, 20))
  end

  it "validates slug format, time zone and opening hours" do
    workspace = build(:workspace, slug: "Not A Slug", time_zone: "Mars/Olympus", opens_at_minute: 600, closes_at_minute: 500)
    expect(workspace).not_to be_valid
    expect(workspace.errors.attribute_names).to include(:slug, :time_zone, :closes_at_minute)
  end
end

RSpec.describe User do
  it "normalises email and requires a reasonably long password" do
    user = build(:user, email: "  Mixed@Example.COM ", password: "short")
    expect(user).not_to be_valid
    expect(user.email).to eq("mixed@example.com")
    expect(user.errors.attribute_names).to include(:password)
  end
end

RSpec.describe User do
  it "starts an invited account without a password, which cannot be used to sign in" do
    invited = User.create!(name: "Quinn", email: "quinn@example.com")
    expect(invited).to be_invited
    expect(User.authenticate_by(email: "quinn@example.com", password: "anything-at-all")).to be_nil
  end

  it "refuses passwords longer than bcrypt reads (72 bytes), counting bytes not characters" do
    expect(build(:user, password: "é" * 37)).not_to be_valid
    expect(build(:user, password: "é" * 36)).to be_valid
  end
end

RSpec.describe Membership do
  it "rejects unknown roles and duplicate memberships" do
    existing = create(:membership)
    duplicate = build(:membership, workspace: existing.workspace, user: existing.user)
    expect(duplicate).not_to be_valid
    expect(build(:membership, role: "owner")).not_to be_valid
  end
end

RSpec.describe Machine do
  it "allows a retired machine's name to be reused" do
    workspace = create(:workspace)
    create(:machine, workspace: workspace, name: "Lathe", retired_at: 1.day.ago)
    expect(build(:machine, workspace: workspace, name: "Lathe")).to be_valid
    create(:machine, workspace: workspace, name: "Lathe")
    expect(build(:machine, workspace: workspace, name: "Lathe")).not_to be_valid
  end

  it "keeps its workspace once created" do
    machine = create(:machine)
    expect { machine.update!(workspace: create(:workspace)) }.to raise_error(ActiveRecord::ActiveRecordError)
  end
end

RSpec.describe Booking do
  let(:workspace) { create(:workspace) }
  let(:machine) { create(:machine, workspace: workspace) }

  it "treats expired holds as not occupying their slot" do
    open_hold = create(:booking, machine: machine, status: "held", starts_at: local_time(workspace, 2026, 3, 11, 10))
    stale_hold = create(:booking, machine: machine, status: "held", starts_at: local_time(workspace, 2026, 3, 11, 11))
    stale_hold.update_columns(hold_expires_at: 1.minute.ago)
    confirmed = create(:booking, machine: machine, starts_at: local_time(workspace, 2026, 3, 11, 12))
    expect(Booking.occupying).to contain_exactly(open_hold, confirmed)
  end

  it "closes a hold at the exact instant it expires, for every check alike" do
    hold = create(:booking, machine: machine, status: "held", starts_at: local_time(workspace, 2026, 3, 11, 10))
    hold.update_columns(hold_expires_at: now)
    expect(hold.hold_open?(now)).to be(false)
    expect(Booking.occupying(now)).to be_empty
    expect(Booking.open_holds(now)).to be_empty
    expect(Booking.expired_holds(now)).to eq([ hold ])
    expect(hold.status_at(now)).to eq("lapsed")
    expect(hold.status_at(now - 1.second)).to eq("held")
  end

  it "finds overlapping bookings with half-open ranges" do
    booking = create(:booking, machine: machine, starts_at: local_time(workspace, 2026, 3, 11, 10))
    start = booking.starts_at
    expect(Booking.overlapping((start + 30.minutes)...(start + 2.hours))).to eq([ booking ])
    expect(Booking.overlapping((start + 1.hour)...(start + 2.hours))).to be_empty
  end
end

RSpec.describe Tenant do
  it "is only built for members of the requested workspace" do
    membership = create(:membership)
    expect(Tenant.resolve(user: membership.user, slug: membership.workspace.slug).workspace).to eq(membership.workspace)
    expect(Tenant.resolve(user: membership.user, slug: create(:workspace).slug)).to be_nil
    expect(Tenant.resolve(user: nil, slug: membership.workspace.slug)).to be_nil
  end

  it "refuses a membership from a different workspace" do
    expect { Tenant.new(workspace: create(:workspace), membership: create(:membership)) }.to raise_error(ArgumentError)
  end

  it "applies the role policy" do
    staff = tenant_for(role: "staff")
    expect(staff.can?(:mark_arrival)).to be(true)
    expect(staff.can?(:book)).to be(false)
    expect { staff.authorize!(:manage_machines) }.to raise_error(DomainError) { |error| expect(error.code).to eq("FORBIDDEN") }
  end
end

RSpec.describe RateLimiter do
  it "allows the limit, then refuses" do
    limiter = RateLimiter.new(key: "test", limit: 2, period: 1.minute)
    2.times { limiter.check! }
    expect { limiter.check! }.to raise_error(DomainError) { |error| expect(error.code).to eq("RATE_LIMITED") }
  end

  it "refunds successful password attempts, and does not recreate a window that has ended" do
    limiter = RateLimiter.new(key: "refund", limit: 1, period: 1.minute)
    limiter.check!
    limiter.refund
    limiter.check!
    travel 2.minutes
    limiter.refund
    expect(Rails.cache.exist?("rate-limit:refund")).to be(false)
  end
end

RSpec.describe ClientAddress do
  def request(remote_addr, forwarded = nil)
    env = { "REMOTE_ADDR" => remote_addr }
    env["HTTP_X_FORWARDED_FOR"] = forwarded if forwarded
    ActionDispatch::Request.new(env)
  end

  let(:proxies) { [ IPAddr.new("10.0.0.0/8") ] }

  it "uses the socket peer unless the peer is a trusted proxy" do
    expect(described_class.of(request("203.0.113.5", "198.51.100.1"), trusted_proxies: [])).to eq("203.0.113.5")
    expect(described_class.of(request("203.0.113.5", "198.51.100.1"), trusted_proxies: proxies)).to eq("203.0.113.5")
  end

  it "takes the nearest untrusted address a trusted proxy reports, skipping junk" do
    chain = "198.51.100.7, 203.0.113.9, 10.0.0.3"
    expect(described_class.of(request("10.0.0.2", chain), trusted_proxies: proxies)).to eq("203.0.113.9")
    expect(described_class.of(request("10.0.0.2", "not-an-ip, 10.0.0.4"), trusted_proxies: proxies)).to eq("10.0.0.2")
  end
end
