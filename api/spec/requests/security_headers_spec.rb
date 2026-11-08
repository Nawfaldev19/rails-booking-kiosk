require "rails_helper"

# Every API response is JSON for scripts. These headers stop browsers from
# sniffing it as another type, rendering or framing it, leaking the URL in a
# referrer, or keeping personal data in a cache.
RSpec.describe "Security headers" do
  def expect_api_headers
    expect(response.headers["X-Content-Type-Options"]).to eq("nosniff")
    expect(response.headers["X-Frame-Options"]).to eq("DENY")
    expect(response.headers["Referrer-Policy"]).to eq("no-referrer")
    expect(response.headers["Content-Security-Policy"]).to eq(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    expect(response.headers["Cross-Origin-Resource-Policy"]).to eq("same-origin")
  end

  it "sends them on GraphQL responses, which are never cached" do
    graphql("{ serverTime }")
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/json")
    expect_api_headers
    expect(response.headers["Cache-Control"]).to eq("no-store")
  end

  it "sends them on refused requests too" do
    post "/graphql", params: "query=%7B%20serverTime%20%7D", headers: { "CONTENT_TYPE" => "application/x-www-form-urlencoded" }
    expect(response).to have_http_status(:unsupported_media_type)
    expect_api_headers
  end

  it "sends them on the health check" do
    get "/up"
    expect(response).to have_http_status(:ok)
    expect_api_headers
  end
end
