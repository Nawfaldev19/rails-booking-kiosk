require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.server_timing = true
  config.cache_store = :memory_store

  # Messages are written to tmp/mails as well as recorded in the outbox table.
  config.action_mailer.delivery_method = :file
  config.action_mailer.file_settings = { location: Rails.root.join("tmp/mails") }
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.default_url_options = { host: "localhost", port: 5173 }

  config.active_support.deprecation = :log
  config.active_record.migration_error = :page_load
  config.active_record.verbose_query_logs = true
  config.active_record.query_log_tags_enabled = true
  config.action_controller.raise_on_missing_callback_actions = true
end
