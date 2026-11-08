require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  config.assume_ssl = ENV.fetch("RAILS_ASSUME_SSL", "true") == "true"
  config.force_ssl = ENV.fetch("RAILS_FORCE_SSL", "true") == "true"
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  config.log_tags = [ :request_id ]
  config.logger = ActiveSupport::TaggedLogging.logger($stdout)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.silence_healthcheck_path = "/up"
  config.active_support.report_deprecations = false

  config.cache_store = :memory_store

  config.action_mailer.default_url_options = { host: ENV.fetch("APP_HOST", "localhost") }
  # Mail goes to an SMTP server unless MAIL_DELIVERY=file is chosen on purpose
  # (files under tmp/mails, for a local trial of the production build). Booting
  # without either fails, so messages are never silently written to disk.
  if ENV.fetch("MAIL_DELIVERY", "smtp") == "file"
    config.action_mailer.delivery_method = :file
    config.action_mailer.file_settings = { location: Rails.root.join("tmp/mails") }
  else
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address: ENV.fetch("SMTP_ADDRESS") { raise KeyError, "Set SMTP_ADDRESS, or MAIL_DELIVERY=file to write mail to tmp/mails" },
      port: Integer(ENV.fetch("SMTP_PORT", "587")),
      user_name: ENV["SMTP_USERNAME"],
      password: ENV["SMTP_PASSWORD"],
      enable_starttls_auto: true
    }.compact
  end

  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [ :id ]
end
