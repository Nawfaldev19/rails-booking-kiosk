# Creates message templates and the outbound_messages outbox. Booking messages
# reference their booking through a composite key, so a message cannot cross
# workspaces either; invitation messages have no booking. Retries wait longer
# after each failed attempt, and `next_attempt_at` also works as a short lease
# while a worker is sending, which keeps a second worker from picking it up.
class CreateMessaging < ActiveRecord::Migration[8.1]
  def change
    create_table :message_templates, id: :uuid do |t|
      t.references :workspace, type: :uuid, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :subject, null: false
      t.text :body, null: false
      t.timestamps

      t.index %i[workspace_id kind], unique: true
      t.check_constraint "kind IN ('booking_confirmed', 'booking_cancelled')", name: "message_templates_kind_valid"
    end

    create_table :outbound_messages, id: :uuid do |t|
      t.uuid :workspace_id, null: false
      t.uuid :booking_id
      t.string :kind, null: false
      t.string :recipient, null: false
      t.string :subject, null: false
      t.text :body, null: false
      t.string :status, null: false, default: "pending"
      t.integer :attempts, null: false, default: 0
      t.text :last_error
      t.boolean :used_fallback_template, null: false, default: false
      t.datetime :delivered_at
      t.datetime :next_attempt_at, null: false
      t.timestamps

      # The outbox page reads newest first and pages with a (created_at, id) cursor.
      t.index %i[workspace_id created_at id]
      t.index :next_attempt_at, where: "status = 'pending'", name: "index_outbound_messages_due"
      t.check_constraint "status IN ('pending', 'delivered', 'failed')", name: "outbound_messages_status_valid"
      t.check_constraint "kind IN ('booking_confirmed', 'booking_cancelled', 'invitation')", name: "outbound_messages_kind_valid"
      t.check_constraint "(kind = 'invitation') = (booking_id IS NULL)", name: "outbound_messages_booking_matches_kind"
    end

    add_foreign_key :outbound_messages, :workspaces
    add_foreign_key :outbound_messages, :bookings, column: %i[booking_id workspace_id], primary_key: %i[id workspace_id]
  end
end
