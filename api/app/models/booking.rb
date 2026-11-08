# A hold or booking of one machine for one half-open time range `[start, end)`.
#
# The `bookings_no_overlap` exclusion constraint guarantees that no two held or
# confirmed bookings of one machine overlap; composite foreign keys keep the
# machine and the member in the booking's own workspace.
#
# @see docs/reference/data-model.md
# @see docs/adr/0001-prevent-double-booking-with-an-exclusion-constraint.md
class Booking < ApplicationRecord
  include TenantOwned

  belongs_to :machine
  belongs_to :membership

  enum :status, {
    held: "held",
    confirmed: "confirmed",
    released: "released",
    lapsed: "lapsed",
    cancelled: "cancelled"
  }, validate: true

  # A hold is open while `now` is before its expiry, and over from that instant on.
  # Every check (the grid, the hold limit, confirming, lapsing) uses this one boundary.
  scope :open_holds, ->(now = Time.current) { held.where("hold_expires_at > ?", now) }
  scope :expired_holds, ->(now = Time.current) { held.where(hold_expires_at: ..now) }
  # Bookings that still occupy their slot at `now`: confirmed ones, plus open holds.
  # An expired hold never blocks anyone, even before the sweeper has marked it lapsed.
  scope :occupying, ->(now = Time.current) { confirmed.or(open_holds(now)) }
  # What a member sees in their own list: an expired hold is not shown at all.
  scope :listed_for_member, ->(now = Time.current) { where(status: %w[confirmed cancelled]).or(open_holds(now)) }
  scope :overlapping, ->(range) {
    where("period && tstzrange(?, ?, '[)')", range.begin, range.end)
  }
  scope :starting_within, ->(range) {
    where("lower(period) >= ? AND lower(period) < ?", range.begin, range.end)
  }
  scope :chronological, -> { order(Arel.sql("lower(period)"), :id) }

  # @return [ActiveSupport::TimeWithZone] start of the slot (inclusive).
  def starts_at
    period.begin
  end

  # @return [ActiveSupport::TimeWithZone] end of the slot (exclusive).
  def ends_at
    period.end
  end

  # @param now [Time]
  # @return [Boolean] true for a hold whose expiry is still ahead of `now`.
  def hold_open?(now = Time.current)
    held? && hold_expires_at > now
  end

  # The status as of `now`: a hold past its expiry reads as lapsed, whether or
  # not the sweeper has written that yet.
  #
  # @param now [Time]
  # @return [String] one of the status values.
  # @see docs/adr/0002-lazy-hold-expiry-with-an-optional-sweep.md
  def status_at(now = Time.current)
    held? && !hold_open?(now) ? "lapsed" : status
  end
end
