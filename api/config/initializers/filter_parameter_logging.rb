# Keeps secrets and personal data out of the request log ("Parameters: …").
#
# Names are matched partially and case-insensitively. GraphQL needs more than
# names: a client chooses its own variable names (`$p` works as well as
# `$password`), so `variables` is dropped whole, and a query can carry values
# as string literals (`signIn(email: "…", password: "…")`), so every string
# literal in `query` is replaced. The shape of the operation stays readable.
graphql_string_literal = /"""(?:[^"\\]|\\.|"(?!""))*"""|"(?:[^"\\\n]|\\.)*"/

Rails.application.config.filter_parameters += [
  :passw, :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn, :cvv, :cvc,
  /\Avariables\z/,
  lambda do |key, value|
    value.replace(value.gsub(graphql_string_literal, '"[FILTERED]"')) if key.to_s == "query" && value.is_a?(String)
  end
]
