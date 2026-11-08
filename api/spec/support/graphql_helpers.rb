module GraphqlHelpers
  # Posts a GraphQL operation the way the web clients do: JSON body, session cookie,
  # and the workspace header.
  def graphql(query, variables: {}, workspace: nil, headers: {})
    request_headers = { "CONTENT_TYPE" => "application/json" }
    request_headers["X-Booking-Kiosk-Workspace"] = workspace if workspace
    post "/graphql", params: { query: query, variables: variables }.to_json, headers: request_headers.merge(headers)
    response.parsed_body
  end

  def sign_in_as(user, password: "correct-horse-1")
    body = graphql(<<~GQL, variables: { email: user.email, password: password })
      mutation($email: String!, $password: String!) { signIn(email: $email, password: $password) { errors { code } } }
    GQL
    expect(body.dig("data", "signIn", "errors")).to eq([])
  end
end

RSpec.configure { |config| config.include GraphqlHelpers, type: :request }
