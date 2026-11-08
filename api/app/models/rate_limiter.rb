# Fixed-window counters on the Rails cache. Enough to slow down password
# guessing; a multi-process deployment would point the cache at a shared store.
class RateLimiter
  PASSWORD_WINDOW = 5.minutes
  PASSWORD_ATTEMPTS_PER_ACCOUNT = 10
  PASSWORD_ATTEMPTS_PER_ADDRESS = 50
  # New-account invitations one workspace may send per hour.
  INVITATIONS_PER_WORKSPACE = 20
  INVITATION_WINDOW = 1.hour

  # Runs a password check under two budgets: one per account, keyed on the
  # normalised email so spacing or case cannot open a fresh window, and a larger
  # one per client address that slows down one client trying many accounts.
  #
  # The attempt is counted before the check (so parallel guesses cannot slip
  # past the limit) and refunded when the password was right, so only failures
  # use up a budget: people signing in successfully behind one shared address
  # never lock each other out.
  #
  # @param email [String] the normalised email.
  # @param remote_ip [String, nil] the client address (see ClientAddress).
  # @yieldreturn [Object, nil] the authenticated record, or nil for a wrong password.
  # @return [Object, nil] whatever the block returned.
  # @raise [DomainError] RATE_LIMITED once either budget is spent.
  # @example
  #   RateLimiter.password_attempt(email: address, remote_ip: ip) { User.authenticate_by(email: address, password: pw) }
  def self.password_attempt(email:, remote_ip: nil)
    limiters = [ new(key: "password:account:#{email}", limit: PASSWORD_ATTEMPTS_PER_ACCOUNT, period: PASSWORD_WINDOW) ]
    if remote_ip.present?
      limiters << new(key: "password:address:#{remote_ip}", limit: PASSWORD_ATTEMPTS_PER_ADDRESS, period: PASSWORD_WINDOW)
    end
    limiters.each(&:check!)
    result = yield
    limiters.each(&:refund) if result
    result
  end

  # @param key [String] what is being counted.
  # @param limit [Integer] attempts allowed per window.
  # @param period [ActiveSupport::Duration] the window length.
  # @param cache [ActiveSupport::Cache::Store]
  def initialize(key:, limit:, period:, cache: Rails.cache)
    @key = "rate-limit:#{key}"
    @limit = limit
    @period = period
    @cache = cache
  end

  # Counts one attempt.
  #
  # @return [void]
  # @raise [DomainError] RATE_LIMITED when the count passes the limit.
  def check!
    count = @cache.increment(@key, 1, expires_in: @period)
    if count.nil?
      @cache.write(@key, 1, expires_in: @period, raw: true)
      count = 1
    end
    raise DomainError.new("RATE_LIMITED", "Too many attempts. Please wait a few minutes.") if count > @limit
  end

  # Takes back one counted attempt. A window that has just ended is left alone,
  # rather than recreated with a negative count and no expiry.
  #
  # @return [void]
  def refund
    @cache.decrement(@key, 1) if @cache.exist?(@key)
  end
end
