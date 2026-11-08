# Creates machines and bookings. Bookings store their time as a tstzrange and
# carry an exclusion constraint so that no two held or confirmed bookings of one
# machine overlap, and composite foreign keys so a booking can only point at a
# machine and a membership of its own workspace.
class CreateMachinesAndBookings < ActiveRecord::Migration[8.1]
  def change
    create_table :machines, id: :uuid do |t|
      t.references :workspace, type: :uuid, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description, null: false, default: ""
      t.integer :slot_minutes, null: false, default: 60
      t.datetime :retired_at
      t.timestamps

      t.index %i[id workspace_id], unique: true
      t.index %i[workspace_id name], unique: true, where: "retired_at IS NULL"
      t.check_constraint "slot_minutes IN (30, 60)", name: "machines_slot_minutes_valid"
    end

    create_table :bookings, id: :uuid do |t|
      t.uuid :workspace_id, null: false
      t.uuid :machine_id, null: false
      t.uuid :membership_id, null: false
      t.string :status, null: false
      t.tstzrange :period, null: false
      t.datetime :hold_expires_at
      t.datetime :confirmed_at
      t.datetime :arrived_at
      t.datetime :cancelled_at
      t.timestamps

      t.index :workspace_id
      t.index %i[id workspace_id], unique: true
      t.index %i[membership_id status]
      t.index :hold_expires_at, where: "status = 'held'", name: "index_bookings_on_open_holds"
      t.check_constraint "status IN ('held', 'confirmed', 'released', 'lapsed', 'cancelled')", name: "bookings_status_valid"
      t.check_constraint "status <> 'held' OR hold_expires_at IS NOT NULL", name: "bookings_holds_expire"
      # An empty range has NULL bounds, which a plain comparison would let through.
      t.check_constraint "NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)",
        name: "bookings_period_bounded"
    end

    # Composite keys make it impossible, at the database level, for a booking to
    # point at a machine or membership that belongs to a different workspace.
    add_foreign_key :bookings, :workspaces
    add_foreign_key :bookings, :machines, column: %i[machine_id workspace_id], primary_key: %i[id workspace_id]
    add_foreign_key :bookings, :memberships, column: %i[membership_id workspace_id], primary_key: %i[id workspace_id]

    # The no-double-booking guarantee: two active bookings for one machine may not overlap.
    # Holds count as active until they are released or lapsed.
    add_exclusion_constraint :bookings, "machine_id WITH =, period WITH &&",
      using: :gist, where: "status IN ('held', 'confirmed')", name: "bookings_no_overlap"

    add_index :bookings, "workspace_id, lower(period)", name: "index_bookings_on_workspace_and_start"
  end
end
