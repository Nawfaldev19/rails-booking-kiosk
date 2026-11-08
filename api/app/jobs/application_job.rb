# Base class for background jobs (the in-process :async adapter; see config/application.rb).
class ApplicationJob < ActiveJob::Base
  # A record removed before the job ran has nothing left to do.
  discard_on ActiveJob::DeserializationError
end
