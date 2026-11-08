require "rails_helper"

RSpec.describe "GraphQL transport and sign-in" do
  let(:user) { create(:user, email: "ada@example.com") }
  let(:membership) { create(:membership, user: user) }
  let(:viewer_query) { "{ viewer { user { email } memberships { role workspace { slug } } } }" }

  it "signs in, exposes the viewer and signs out" do
    membership
    sign_in_as(user)
    body = graphql(viewer_query)
    expect(body.dig("data", "viewer", "user", "email")).to eq("ada@example.com")
    expect(body.dig("data", "viewer", "memberships")).to eq([ { "role" => "MEMBER", "workspace" => { "slug" => membership.workspace.slug } } ])

    graphql("mutation { signOut { signedOut } }")
    expect(graphql(viewer_query).dig("data", "viewer")).to be_nil
  end

  it "accepts the email in any case" do
    user
    body = graphql('mutation { signIn(email: "  ADA@example.com", password: "correct-horse-1") { errors { code } } }')
    expect(body.dig("data", "signIn", "errors")).to eq([])
  end

  it "rejects a wrong password with a typed error and no session" do
    user
    body = graphql('mutation { signIn(email: "ada@example.com", password: "nope-nope-nope") { viewer { user { id } } errors { code } } }')
    expect(body.dig("data", "signIn")).to eq("viewer" => nil, "errors" => [ { "code" => "INVALID_CREDENTIALS" } ])
    expect(graphql(viewer_query).dig("data", "viewer")).to be_nil
  end

  def sign_in_code(email, password = "wrong-wrong-1")
    graphql("mutation($e: String!, $p: String!) { signIn(email: $e, password: $p) { errors { code } } }",
      variables: { e: email, p: password }).dig("data", "signIn", "errors", 0, "code")
  end

  it "rate-limits repeated sign-in attempts" do
    user
    codes = Array.new(11) { sign_in_code("ada@example.com") }
    expect(codes.first(10)).to all(eq("INVALID_CREDENTIALS"))
    expect(codes.last).to eq("RATE_LIMITED")
  end

  it "counts every spelling of one address against the same account budget" do
    user
    spellings = [ "ada@example.com", " ada@example.com", "ADA@example.com ", "\tAda@Example.com", "ada@EXAMPLE.com\n" ]
    codes = Array.new(RateLimiter::PASSWORD_ATTEMPTS_PER_ACCOUNT) { |i| sign_in_code(spellings[i % spellings.size]) }
    expect(codes).to all(eq("INVALID_CREDENTIALS"))
    expect(sign_in_code(" ADA@example.com\t", "correct-horse-1")).to eq("RATE_LIMITED")
  end

  it "opens the account budget again once the window has passed" do
    user
    RateLimiter::PASSWORD_ATTEMPTS_PER_ACCOUNT.times { sign_in_code("ada@example.com") }
    expect(sign_in_code("ada@example.com")).to eq("RATE_LIMITED")
    travel RateLimiter::PASSWORD_WINDOW + 1.second
    expect(sign_in_code("ada@example.com", "correct-horse-1")).to be_nil
  end

  it "also limits one client address spraying many accounts" do
    codes = Array.new(RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS + 1) { |i| sign_in_code("nobody#{i}@example.com") }
    expect(codes.first(RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS)).to all(eq("INVALID_CREDENTIALS"))
    expect(codes.last).to eq("RATE_LIMITED")
  end

  it "rotates the session on sign-in" do
    user
    graphql(viewer_query)
    before = cookies["_booking_kiosk_session"]
    sign_in_as(user)
    expect(cookies["_booking_kiosk_session"]).not_to eq(before)
  end

  it "refuses requests that are not JSON (blocks form-based cross-site posts)" do
    post "/graphql", params: { query: viewer_query }
    expect(response).to have_http_status(:unsupported_media_type)
  end

  it "refuses browser requests from origins it does not know" do
    post "/graphql", params: { query: viewer_query }.to_json,
      headers: { "CONTENT_TYPE" => "application/json", "Origin" => "https://attacker.example" }
    expect(response).to have_http_status(:forbidden)
  end

  it "accepts allowed origins and JSON-string variables" do
    post "/graphql", params: { query: "query($n: Boolean!) { viewer @include(if: $n) { user { id } } }", variables: '{"n":true}' }.to_json,
      headers: { "CONTENT_TYPE" => "application/json", "Origin" => "http://localhost:5173" }
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["data"]).to eq("viewer" => nil)
  end

  it "answers malformed variables with 400" do
    post "/graphql", params: { query: viewer_query, variables: "{nope" }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:bad_request)
  end

  it "asks signed-out callers to sign in before mutating" do
    body = graphql('mutation { placeHold(machineId: "x", startsAt: "2026-03-11T10:00:00Z") { errors { code } } }', workspace: "anything")
    expect(body.dig("data", "placeHold", "errors", 0, "code")).to eq("UNAUTHENTICATED")
  end

  it "tells a signed-in person outside the workspace that they are not allowed" do
    sign_in_as(user)
    body = graphql('mutation { placeHold(machineId: "x", startsAt: "2026-03-11T10:00:00Z") { errors { code } } }', workspace: "anything")
    expect(body.dig("data", "placeHold", "errors", 0, "code")).to eq("FORBIDDEN")
  end

  it "reports the server clock for countdowns" do
    expect(graphql("{ serverTime }").dig("data", "serverTime")).to eq("2026-03-10T12:00:00Z")
  end

  it "does not count successful sign-ins against either budget" do
    user
    (RateLimiter::PASSWORD_ATTEMPTS_PER_ACCOUNT + 5).times { expect(sign_in_code("ada@example.com", "correct-horse-1")).to be_nil }
    (RateLimiter::PASSWORD_ATTEMPTS_PER_ACCOUNT - 1).times { sign_in_code("ada@example.com") }
    expect(sign_in_code("ada@example.com")).to eq("INVALID_CREDENTIALS")
    expect(sign_in_code("ada@example.com")).to eq("RATE_LIMITED")
  end

  describe "client addresses for the per-address limit" do
    def spray(count, forwarded_for: nil, remote_addr: "203.0.113.9")
      Array.new(count) do |i|
        headers = { "REMOTE_ADDR" => remote_addr }
        headers["X-Forwarded-For"] = forwarded_for.call(i) if forwarded_for
        graphql("mutation($e: String!) { signIn(email: $e, password: \"wrong-wrong-1\") { errors { code } } }",
          variables: { e: "nobody#{i}@example.com" }, headers: headers).dig("data", "signIn", "errors", 0, "code")
      end
    end

    it "ignores X-Forwarded-For by default, so a client cannot claim a fresh address per request" do
      codes = spray(RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS + 1, forwarded_for: ->(i) { "198.51.100.#{i}" })
      expect(codes.last).to eq("RATE_LIMITED")
    end

    it "believes X-Forwarded-For only from a configured proxy" do
      proxies = [ IPAddr.new("127.0.0.1") ]
      allow(Rails.application.config.x).to receive(:trusted_proxies).and_return(proxies)
      codes = spray(RateLimiter::PASSWORD_ATTEMPTS_PER_ADDRESS + 1, remote_addr: "127.0.0.1", forwarded_for: ->(i) { "198.51.100.#{i}" })
      expect(codes).to all(eq("INVALID_CREDENTIALS"))
    end
  end

  describe "session lifetime" do
    it "ends a session after two idle hours" do
      user
      sign_in_as(user)
      travel 2.hours + 1.second
      expect(graphql(viewer_query).dig("data", "viewer")).to be_nil
    end

    it "keeps an active session going, but never past 12 hours from sign-in" do
      user
      sign_in_as(user)
      11.times do
        travel 1.hour
        expect(graphql(viewer_query).dig("data", "viewer", "user", "email")).to eq("ada@example.com")
      end
      travel 1.hour + 1.second
      expect(graphql(viewer_query).dig("data", "viewer")).to be_nil
    end
  end

  it "never writes a sign-in's password or email to the log, inline or in variables" do
    user
    output = StringIO.new
    Rails.logger.broadcast_to(ActiveSupport::Logger.new(output))
    graphql('mutation { signIn(email: "ada@example.com", password: "inline-secret-123") { errors { code } } }')
    graphql("mutation($e: String!, $p: String!) { signIn(email: $e, password: $p) { errors { code } } }",
      variables: { e: "ada@example.com", p: "variable-secret-123" })
    post "/graphql", params: { query: "mutation($p: String!) { signIn(email: \"x@example.com\", password: $p) { errors { code } } }",
                               variables: '{"p":"string-secret-123"}' }.to_json, headers: { "CONTENT_TYPE" => "application/json" }
    log = output.string
    expect(log).to include("Parameters:", "signIn")
    expect(log).not_to include("inline-secret-123", "variable-secret-123", "string-secret-123", "ada@example.com")
  ensure
    Rails.logger.stop_broadcasting_to(Rails.logger.broadcasts.last)
  end

  describe "limits on what one request can ask for" do
    it "refuses query documents over 10,000 characters before parsing them" do
      post "/graphql", params: { query: "{ serverTime }" + (" " * GraphqlController::MAX_QUERY_LENGTH) }.to_json,
        headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end

    it "refuses queries with too many tokens" do
      body = graphql("{ #{Array.new(400) { |i| "t#{i}: serverTime" }.join(' ')} }")
      expect(body.dig("errors", 0, "message")).to eq("This query is too large to execute.")
      expect(body["data"]).to be_nil
    end

    it "refuses queries nested deeper than 10 levels" do
      nested = "{ __schema { types { fields { type { ofType { ofType { ofType { ofType { ofType { ofType { name } } } } } } } } } } }"
      expect(graphql(nested).dig("errors", 0, "message")).to match(/exceeds max depth of 10/)
    end

    it "refuses queries whose estimated cost passes 400" do
      membership
      sign_in_as(user)
      expensive = "{ workspace(slug: \"#{membership.workspace.slug}\") { myBookings(first: 50) { nodes { id status startsAt endsAt machine { id name description } } } } }"
      expect(graphql(expensive).dig("errors", 0, "message")).to match(/exceeds max complexity of 400/)
    end
  end

  it "reports the health check" do
    get "/up"
    expect(response).to have_http_status(:ok)
  end
end
