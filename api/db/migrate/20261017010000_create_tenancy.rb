# Creates workspaces, global users, the memberships that join them with a role,
# and invitations for people added by a manager. Enables btree_gist (needed later
# by the no-overlap exclusion constraint) and citext, so email uniqueness ignores
# case in the database itself.
class CreateTenancy < ActiveRecord::Migration[8.1]
  def change
    enable_extension "btree_gist"
    enable_extension "citext"

    create_table :workspaces, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.string :time_zone, null: false, default: "UTC"
      t.integer :opens_at_minute, null: false, default: 9 * 60
      t.integer :closes_at_minute, null: false, default: 21 * 60
      t.integer :hold_minutes, null: false, default: 5
      t.integer :max_active_holds, null: false, default: 3
      t.timestamps

      t.check_constraint "opens_at_minute >= 0 AND closes_at_minute <= 1440 AND opens_at_minute < closes_at_minute",
        name: "workspaces_opening_hours_valid"
      t.check_constraint "hold_minutes BETWEEN 1 AND 60", name: "workspaces_hold_minutes_range"
      t.check_constraint "max_active_holds BETWEEN 1 AND 20", name: "workspaces_max_active_holds_range"
    end

    create_table :users, id: :uuid do |t|
      t.citext :email, null: false, index: { unique: true }
      t.string :name, null: false
      # Null until an invited person chooses a password; such an account cannot sign in.
      t.string :password_digest
      t.timestamps
    end

    create_table :memberships, id: :uuid do |t|
      t.references :workspace, type: :uuid, null: false, foreign_key: true
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :role, null: false
      t.timestamps

      t.index %i[workspace_id user_id], unique: true
      # Target for composite foreign keys that pin child records to the same workspace.
      t.index %i[id workspace_id], unique: true
      t.check_constraint "role IN ('member', 'manager', 'staff')", name: "memberships_role_valid"
    end

    # Only a SHA-256 digest of each one-time token is stored, so a copy of the
    # table cannot be used to accept an invitation. Deleting the membership
    # deletes its invitations.
    create_table :invitations, id: :uuid do |t|
      t.uuid :workspace_id, null: false
      t.uuid :membership_id, null: false
      t.string :token_digest, null: false, index: { unique: true }
      t.datetime :expires_at, null: false
      t.timestamps

      t.index :membership_id
    end
    add_foreign_key :invitations, :workspaces
    add_foreign_key :invitations, :memberships, column: %i[membership_id workspace_id], primary_key: %i[id workspace_id],
      on_delete: :cascade
  end
end
