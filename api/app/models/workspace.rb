# A makerspace: the tenant boundary. Every workspace-owned record carries its id.
#
# Opening hours are stored as minutes after local midnight in the workspace's
# IANA time zone.
class Workspace < ApplicationRecord
  # Members can book today and the 13 days after it.
  BOOKING_HORIZON_DAYS = 14

  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :machines, dependent: :destroy
  has_many :bookings, dependent: :destroy
  has_many :message_templates, dependent: :destroy
  has_many :outbound_messages, dependent: :destroy

  validates :name, presence: true, length: { maximum: 80 }
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ }
  validates :opens_at_minute, :closes_at_minute, numericality: { only_integer: true, in: 0..1440 }
  validate :opens_before_closing
  validate :known_time_zone

  # @return [ActiveSupport::TimeZone]
  def zone
    ActiveSupport::TimeZone[time_zone]
  end

  # @return [Date] today in the workspace's zone.
  def today
    zone.today
  end

  # The calendar dates that can be booked, as seen at `now` in this workspace's zone.
  #
  # @param now [Time]
  # @return [Range<Date>] today through today + 13.
  def bookable_dates(now = Time.current)
    first = now.in_time_zone(zone).to_date
    first..(first + BOOKING_HORIZON_DAYS - 1)
  end

  # Opening and closing instants for a calendar date in this workspace's time zone.
  # Each end is built from local wall-clock fields, never "midnight plus N minutes",
  # so the hour lost or gained on a daylight-saving day does not shift opening time.
  #
  # @param date [Date]
  # @return [Range<ActiveSupport::TimeWithZone>] half-open, opening to closing.
  def opening_window(date)
    local_minute(date, opens_at_minute)...local_minute(date, closes_at_minute)
  end

  # @param date [Date]
  # @return [Range<ActiveSupport::TimeWithZone>] half-open, local midnight to the next local midnight.
  def day_window(date)
    local_minute(date, 0)...local_minute(date, 1440)
  end

  private

  def local_minute(date, minute)
    return local_minute(date + 1, 0) if minute == 1440

    zone.local(date.year, date.month, date.day, minute / 60, minute % 60)
  end

  def known_time_zone
    errors.add(:time_zone, "is not a known IANA time zone") unless TZInfo::Timezone.all_identifiers.include?(time_zone.to_s)
  end

  def opens_before_closing
    return if opens_at_minute.blank? || closes_at_minute.blank?

    errors.add(:closes_at_minute, "must be after opening time") unless opens_at_minute < closes_at_minute
  end
end
