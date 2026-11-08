require_relative "boot"

require "rails"
require "ipaddr"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"

Bundler.require(*Rails.groups)

module BookingKiosk
  # The release this code belongs to; it matches the latest CHANGELOG.md entry
  # and the versions in web/package.json (a spec checks all three).
  VERSION = "1.0.0"

  class Application < Rails::Application
    config.load_defaults 8.1
    config.autoload_lib(ignore: %w[tasks])

    config.api_only = true
    config.time_zone = "UTC"
    # In-process job execution. Durability comes from the outbox table, not the
    # queue: undelivered messages are retried by `bin/rails booking_kiosk:tick`.
    config.active_job.queue_adapter = :async

    # The GraphQL endpoint authenticates with an encrypted, HTTP-only session
    # cookie, so the API-only stack gets the cookie and session middleware back.
    # The cookie expires after two idle hours (its expiry is signed into the
    # cookie, so an old copy cannot be replayed); User::SESSION_LIFETIME caps a
    # session at 12 hours from sign-in however active it is.
    config.session_store :cookie_store,
      key: "_booking_kiosk_session",
      same_site: :lax,
      secure: ENV.fetch("SESSION_COOKIE_SECURE", Rails.env.production?.to_s) == "true",
      expire_after: 2.hours
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options

    # Browser origins allowed to call the API. The Vite dev servers proxy requests,
    # so in development the browser origin is the app's own origin.
    config.x.allowed_origins = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

    # Proxies whose X-Forwarded-For header is believed (addresses or CIDR ranges,
    # comma-separated). Empty by default: the socket peer is the client.
    config.x.trusted_proxies = ENV.fetch("TRUSTED_PROXIES", "").split(",").map(&:strip).reject(&:empty?).map { IPAddr.new(_1) }

    # Where invitation links point: the member app's origin.
    config.x.member_app_url = ENV.fetch("MEMBER_APP_URL", "http://localhost:5173")

    # Every response is JSON for scripts, never a document to render or frame.
    # Rails already sends nosniff and a referrer policy; these tighten the rest
    # (see docs/security/threat-model.md). The HTML health check at /up loses
    # its inline colour under this policy, which is harmless.
    config.action_dispatch.default_headers.merge!(
      "X-Frame-Options" => "DENY",
      "Referrer-Policy" => "no-referrer",
      "Content-Security-Policy" => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "Cross-Origin-Resource-Policy" => "same-origin"
    )

    config.generators do |g|
      g.orm :active_record, primary_key_type: :uuid
      g.test_framework :rspec
    end
  end
end
