# Works out which client address a request came from, for the per-address
# sign-in limit.
#
# X-Forwarded-For is written by whoever sends the request, so it is believed
# only when the direct peer is a proxy listed in TRUSTED_PROXIES; the address
# used is then the nearest one in the header that is not itself a trusted
# proxy. With no trusted proxies (the default) the header is ignored and the
# socket peer is the client. Rails' own `request.remote_ip` is not used: it
# reads X-Forwarded-For whoever the peer is.
#
# @see docs/reference/configuration.md
module ClientAddress
  # @param request [ActionDispatch::Request]
  # @param trusted_proxies [Array<IPAddr>] from `config.x.trusted_proxies`.
  # @return [String] an IP address.
  # @example
  #   ClientAddress.of(request, trusted_proxies: [IPAddr.new("127.0.0.1")])
  def self.of(request, trusted_proxies: Rails.application.config.x.trusted_proxies)
    peer = request.remote_addr
    return peer unless trusted?(peer, trusted_proxies)

    forwarded = request.headers["X-Forwarded-For"].to_s.split(",").map(&:strip).reverse
    forwarded.find { |address| valid?(address) && !trusted?(address, trusted_proxies) } || peer
  end

  # @return [Boolean] whether `address` is inside one of the trusted ranges.
  def self.trusted?(address, trusted_proxies)
    trusted_proxies.any? { |range| range.include?(address) }
  rescue IPAddr::Error
    false
  end

  # @return [Boolean] whether `address` parses as an IPv4 or IPv6 address.
  def self.valid?(address)
    IPAddr.new(address)
    true
  rescue IPAddr::Error
    false
  end
  private_class_method :trusted?, :valid?
end
