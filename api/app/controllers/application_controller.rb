# Base controller for the JSON API. Cookies are mixed back in because the API
# authenticates with a session cookie (ADR 0007).
class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ActionController::BadRequest do |error|
    render json: { errors: [ { message: error.message } ] }, status: :bad_request
  end
end
