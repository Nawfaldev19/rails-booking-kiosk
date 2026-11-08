# The single GraphQL endpoint, POST /graphql.
#
# It accepts only JSON, refuses unknown browser origins and over-long queries,
# resolves the session user and the workspace header into the GraphQL context,
# and logs one structured line per operation (the operation name only; the
# request-parameter log is filtered in config/initializers/filter_parameter_logging.rb).
#
# @see docs/security/threat-model.md
class GraphqlController < ApplicationController
  # The request header naming the workspace a mutation acts in.
  WORKSPACE_HEADER = "X-Booking-Kiosk-Workspace".freeze
  # The longest query document accepted, in characters. The clients' largest is
  # under 1,000; together with the schema's token, depth and complexity limits
  # this bounds the work one request can ask for before any parsing happens.
  MAX_QUERY_LENGTH = 10_000

  before_action :require_json
  before_action :verify_origin

  # Runs one GraphQL operation and renders its result as JSON.
  #
  # Responses carry personal data (bookings, names, emails), so they are marked
  # `Cache-Control: no-store` and never kept by browsers or shared caches.
  #
  # @return [void]
  def execute
    response.headers["Cache-Control"] = "no-store"
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    query = params[:query].to_s
    raise ActionController::BadRequest, "query is too long" if query.length > MAX_QUERY_LENGTH

    user = session_user
    tenant = Tenant.resolve(user: user, slug: request.headers[WORKSPACE_HEADER])

    result = BookingKioskSchema.execute(
      query,
      variables: variables_param,
      operation_name: params[:operationName],
      context: {
        current_user: user,
        tenant: tenant,
        remote_ip: ClientAddress.of(request),
        sign_in: ->(signed_in) { reset_session; session[:auth] = signed_in.generate_token_for(:session) },
        sign_out: -> { reset_session }
      }
    )

    log_operation(started, user, tenant, result)
    render json: result
  end

  private

  # The signed-in user, or nil. The session holds a signed token that names
  # the user and expires User::SESSION_LIFETIME after sign-in; it also stops
  # working when the password changes, which signs out every other session.
  #
  # @return [User, nil]
  def session_user
    return if session[:auth].blank?

    user = User.find_by_token_for(:session, session[:auth])
    reset_session unless user
    user
  end

  def variables_param
    raw = params[:variables]
    case raw
    when ActionController::Parameters then raw.to_unsafe_h
    when String then raw.present? ? JSON.parse(raw) : {}
    when nil then {}
    else raise ActionController::BadRequest, "variables must be an object"
    end
  rescue JSON::ParserError
    raise ActionController::BadRequest, "variables must be valid JSON"
  end

  # Browsers cannot send a cross-site application/json POST without a CORS
  # preflight, which this API never approves. Together with SameSite=Lax
  # cookies and the origin check below, that blocks cross-site request forgery.
  def require_json
    head :unsupported_media_type unless request.media_type == "application/json"
  end

  def verify_origin
    origin = request.headers["Origin"]
    return if origin.blank? || Rails.application.config.x.allowed_origins.include?(origin)

    head :forbidden
  end

  def log_operation(started, user, tenant, result)
    Rails.logger.info({
      msg: "graphql",
      request_id: request.request_id,
      operation: params[:operationName],
      user_id: user&.id,
      workspace_id: tenant&.workspace&.id,
      errors: result["errors"]&.size || 0,
      duration_ms: ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(1)
    }.to_json)
  end
end
