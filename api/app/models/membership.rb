# A user's role in one workspace. One membership per user and workspace.
class Membership < ApplicationRecord
  belongs_to :workspace
  belongs_to :user
  has_many :bookings, dependent: :restrict_with_exception
  # The database deletes them with the membership as well.
  has_many :invitations, dependent: :delete_all

  enum :role, { member: "member", manager: "manager", staff: "staff" }, validate: true

  validates :user_id, uniqueness: { scope: :workspace_id }
end
