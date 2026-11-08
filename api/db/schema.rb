# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_17_010200) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"

  create_table "bookings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.uuid "machine_id", null: false
    t.uuid "membership_id", null: false
    t.string "status", null: false
    t.tstzrange "period", null: false
    t.datetime "hold_expires_at"
    t.datetime "confirmed_at"
    t.datetime "arrived_at"
    t.datetime "cancelled_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "workspace_id, lower(period)", name: "index_bookings_on_workspace_and_start"
    t.index ["hold_expires_at"], name: "index_bookings_on_open_holds", where: "((status)::text = 'held'::text)"
    t.index ["id", "workspace_id"], name: "index_bookings_on_id_and_workspace_id", unique: true
    t.index ["membership_id", "status"], name: "index_bookings_on_membership_id_and_status"
    t.index ["workspace_id"], name: "index_bookings_on_workspace_id"
    t.check_constraint "NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)", name: "bookings_period_bounded"
    t.check_constraint "status::text <> 'held'::text OR hold_expires_at IS NOT NULL", name: "bookings_holds_expire"
    t.check_constraint "status::text = ANY (ARRAY['held'::character varying, 'confirmed'::character varying, 'released'::character varying, 'lapsed'::character varying, 'cancelled'::character varying]::text[])", name: "bookings_status_valid"
    t.exclusion_constraint "machine_id WITH =, period WITH &&", where: "(status)::text = ANY ((ARRAY['held'::character varying, 'confirmed'::character varying])::text[])", using: :gist, name: "bookings_no_overlap"
  end

  create_table "invitations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.uuid "membership_id", null: false
    t.string "token_digest", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["membership_id"], name: "index_invitations_on_membership_id"
    t.index ["token_digest"], name: "index_invitations_on_token_digest", unique: true
  end

  create_table "machines", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.string "name", null: false
    t.text "description", default: "", null: false
    t.integer "slot_minutes", default: 60, null: false
    t.datetime "retired_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "workspace_id"], name: "index_machines_on_id_and_workspace_id", unique: true
    t.index ["workspace_id", "name"], name: "index_machines_on_workspace_id_and_name", unique: true, where: "(retired_at IS NULL)"
    t.index ["workspace_id"], name: "index_machines_on_workspace_id"
    t.check_constraint "slot_minutes = ANY (ARRAY[30, 60])", name: "machines_slot_minutes_valid"
  end

  create_table "memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.uuid "user_id", null: false
    t.string "role", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id", "workspace_id"], name: "index_memberships_on_id_and_workspace_id", unique: true
    t.index ["user_id"], name: "index_memberships_on_user_id"
    t.index ["workspace_id", "user_id"], name: "index_memberships_on_workspace_id_and_user_id", unique: true
    t.index ["workspace_id"], name: "index_memberships_on_workspace_id"
    t.check_constraint "role::text = ANY (ARRAY['member'::character varying, 'manager'::character varying, 'staff'::character varying]::text[])", name: "memberships_role_valid"
  end

  create_table "message_templates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.string "kind", null: false
    t.string "subject", null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workspace_id", "kind"], name: "index_message_templates_on_workspace_id_and_kind", unique: true
    t.index ["workspace_id"], name: "index_message_templates_on_workspace_id"
    t.check_constraint "kind::text = ANY (ARRAY['booking_confirmed'::character varying, 'booking_cancelled'::character varying]::text[])", name: "message_templates_kind_valid"
  end

  create_table "outbound_messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "workspace_id", null: false
    t.uuid "booking_id"
    t.string "kind", null: false
    t.string "recipient", null: false
    t.string "subject", null: false
    t.text "body", null: false
    t.string "status", default: "pending", null: false
    t.integer "attempts", default: 0, null: false
    t.text "last_error"
    t.boolean "used_fallback_template", default: false, null: false
    t.datetime "delivered_at"
    t.datetime "next_attempt_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["next_attempt_at"], name: "index_outbound_messages_due", where: "((status)::text = 'pending'::text)"
    t.index ["workspace_id", "created_at", "id"], name: "index_outbound_messages_on_workspace_id_and_created_at_and_id"
    t.check_constraint "(kind::text = 'invitation'::text) = (booking_id IS NULL)", name: "outbound_messages_booking_matches_kind"
    t.check_constraint "kind::text = ANY (ARRAY['booking_confirmed'::character varying, 'booking_cancelled'::character varying, 'invitation'::character varying]::text[])", name: "outbound_messages_kind_valid"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'delivered'::character varying, 'failed'::character varying]::text[])", name: "outbound_messages_status_valid"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.citext "email", null: false
    t.string "name", null: false
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "workspaces", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "time_zone", default: "UTC", null: false
    t.integer "opens_at_minute", default: 540, null: false
    t.integer "closes_at_minute", default: 1260, null: false
    t.integer "hold_minutes", default: 5, null: false
    t.integer "max_active_holds", default: 3, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_workspaces_on_slug", unique: true
    t.check_constraint "hold_minutes >= 1 AND hold_minutes <= 60", name: "workspaces_hold_minutes_range"
    t.check_constraint "max_active_holds >= 1 AND max_active_holds <= 20", name: "workspaces_max_active_holds_range"
    t.check_constraint "opens_at_minute >= 0 AND closes_at_minute <= 1440 AND opens_at_minute < closes_at_minute", name: "workspaces_opening_hours_valid"
  end

  add_foreign_key "bookings", "machines", column: ["machine_id", "workspace_id"], primary_key: ["id", "workspace_id"]
  add_foreign_key "bookings", "memberships", column: ["membership_id", "workspace_id"], primary_key: ["id", "workspace_id"]
  add_foreign_key "bookings", "workspaces"
  add_foreign_key "invitations", "memberships", column: ["membership_id", "workspace_id"], primary_key: ["id", "workspace_id"], on_delete: :cascade
  add_foreign_key "invitations", "workspaces"
  add_foreign_key "machines", "workspaces"
  add_foreign_key "memberships", "users"
  add_foreign_key "memberships", "workspaces"
  add_foreign_key "message_templates", "workspaces"
  add_foreign_key "outbound_messages", "bookings", column: ["booking_id", "workspace_id"], primary_key: ["id", "workspace_id"]
  add_foreign_key "outbound_messages", "workspaces"
end
