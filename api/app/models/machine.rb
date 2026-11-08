# A bookable machine. Retiring sets `retired_at`; the record and its history stay.
class Machine < ApplicationRecord
  include TenantOwned

  has_many :bookings, dependent: :restrict_with_exception

  scope :in_service, -> { where(retired_at: nil) }

  normalizes :name, with: ->(name) { name.strip }
  # A null description from the API means "no description", never a NULL in the column.
  normalizes :description, with: ->(description) { description.to_s.strip }, apply_to_nil: true

  validates :name, presence: true, length: { maximum: 80 },
    uniqueness: { scope: :workspace_id, conditions: -> { in_service }, unless: :retired? }
  validates :description, length: { maximum: 500 }
  validates :slot_minutes, inclusion: { in: [ 30, 60 ] }

  # @return [Boolean] true once taken out of service.
  def retired?
    retired_at.present?
  end

  # @param now [Time]
  # @return [Boolean] true when a confirmed booking or open hold has not ended yet.
  def upcoming_bookings?(now = Time.current)
    bookings.occupying(now).where("upper(period) > ?", now).exists?
  end
end
