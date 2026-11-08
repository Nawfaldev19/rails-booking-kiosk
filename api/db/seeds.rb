# Demo data for two fictional makerspaces. Every person and address is invented,
# and every email uses the reserved example.com domain.
#
#   bin/rails db:seed:replant   # wipe and reseed
#
# Demo password for every account: booking-kiosk-demo-pass
#
# The test database stays empty (`db:prepare` would otherwise seed it when it is
# first created); specs build exactly the records they need.
return if Rails.env.test?

PASSWORD = "booking-kiosk-demo-pass".freeze

def person(name, email)
  User.find_or_create_by!(email: email) { |user| user.name = name; user.password = PASSWORD }
end

def slot_at(workspace, date, hour, minute = 0)
  workspace.zone.local(date.year, date.month, date.day, hour, minute)
end

def book!(workspace, machine, membership, starts_at, status:, arrived: false)
  workspace.bookings.create!(
    machine: machine,
    membership: membership,
    status: status,
    period: starts_at...(starts_at + machine.slot_minutes.minutes),
    confirmed_at: starts_at - 2.days,
    arrived_at: arrived ? starts_at - 5.minutes : nil
  )
end

larkspur = Workspace.create!(name: "Larkspur Makerspace", slug: "larkspur", time_zone: "Europe/London",
  opens_at_minute: 8 * 60, closes_at_minute: 22 * 60)
wharf = Workspace.create!(name: "Wharf Street Workshop", slug: "wharf-street", time_zone: "America/Toronto",
  opens_at_minute: 10 * 60, closes_at_minute: 20 * 60)

manager = person("Robin Ashdown", "robin@example.com")
member = person("Sam Okafor", "sam@example.com")
member_two = person("Kit Marlowe-Price", "kit@example.com")
member_three = person("Ines Valdés", "ines@example.com")
staff = person("Jules Fenwick", "jules@example.com")
other_member = person("Alex Moreau", "alex@example.com")

memberships = {
  manager: larkspur.memberships.create!(user: manager, role: :manager),
  member: larkspur.memberships.create!(user: member, role: :member),
  member_two: larkspur.memberships.create!(user: member_two, role: :member),
  member_three: larkspur.memberships.create!(user: member_three, role: :member),
  staff: larkspur.memberships.create!(user: staff, role: :staff)
}
wharf_member = wharf.memberships.create!(user: other_member, role: :member)
wharf.memberships.create!(user: member, role: :member)

laser = larkspur.machines.create!(name: "Laser cutter", slot_minutes: 60,
  description: "60 W CO2 laser, 600 × 400 mm bed. Induction required.")
printer_a = larkspur.machines.create!(name: "3D printer A", slot_minutes: 30, description: "PLA and PETG, 0.4 mm nozzle.")
printer_b = larkspur.machines.create!(name: "3D printer B", slot_minutes: 30, description: "Resin printer for fine detail.")
lathe = larkspur.machines.create!(name: "Wood lathe", slot_minutes: 60, description: "Bowls and spindles up to 300 mm.")
larkspur.machines.create!(name: "Vinyl cutter", slot_minutes: 30, description: "Retired after the 2025 upgrade.",
  retired_at: 30.days.ago)

wharf.machines.create!(name: "CNC router", slot_minutes: 60, description: "1220 × 2440 mm sheet router.")
wharf_saw = wharf.machines.create!(name: "Panel saw", slot_minutes: 30, description: "Vertical panel saw.")

today = larkspur.today
day_sheet = [
  [ laser, :member, 9, true ], [ printer_a, :member_two, 10, true ], [ lathe, :member_three, 11, false ],
  [ printer_b, :member, 13, false ], [ laser, :member_two, 15, false ], [ printer_a, :member_three, 17, false ],
  [ lathe, :member, 19, false ]
]
day_sheet.each do |machine, who, hour, arrived|
  book!(larkspur, machine, memberships.fetch(who), slot_at(larkspur, today, hour), status: :confirmed, arrived: arrived)
end

(1..12).each do |days_ago|
  date = today - days_ago
  book!(larkspur, laser, memberships[:member], slot_at(larkspur, date, 10), status: :confirmed, arrived: true)
  book!(larkspur, printer_a, memberships[:member_two], slot_at(larkspur, date, 14), status: :confirmed, arrived: true) if days_ago.even?
  book!(larkspur, lathe, memberships[:member_three], slot_at(larkspur, date, 18), status: :confirmed, arrived: days_ago % 3 != 0) if days_ago % 3 == 0
end

tomorrow = today + 1
book!(larkspur, laser, memberships[:member_two], slot_at(larkspur, tomorrow, 10), status: :confirmed)
book!(larkspur, lathe, memberships[:member], slot_at(larkspur, tomorrow, 16), status: :confirmed)
book!(wharf, wharf_saw, wharf_member, slot_at(wharf, wharf.today + 1, 11), status: :confirmed)

larkspur.message_templates.create!(
  kind: :booking_confirmed,
  subject: "You're booked on the {{ machine.name }}, {{ booking.date }}",
  body: <<~LIQUID
    Hi {{ member.name }},

    The {{ machine.name }} is yours on {{ booking.date }} from {{ booking.starts_at }} to {{ booking.ends_at }}.
    Safety glasses are by the door. See you at {{ workspace.name }}!
  LIQUID
)

puts "Seeded #{Workspace.count} workspaces, #{User.count} people, #{Booking.count} bookings. Password: #{PASSWORD}"
