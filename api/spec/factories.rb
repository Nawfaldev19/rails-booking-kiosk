FactoryBot.define do
  factory :workspace do
    sequence(:name) { |n| "Workshop #{n}" }
    sequence(:slug) { |n| "workshop-#{n}" }
    time_zone { "Europe/London" }
    opens_at_minute { 9 * 60 }
    closes_at_minute { 21 * 60 }
  end

  factory :user do
    sequence(:name) { |n| "Person #{n}" }
    sequence(:email) { |n| "person#{n}@example.com" }
    password { "correct-horse-1" }
  end

  factory :membership do
    workspace
    user
    role { "member" }
  end

  factory :machine do
    workspace
    sequence(:name) { |n| "Machine #{n}" }
    slot_minutes { 60 }
  end

  factory :booking do
    machine
    workspace { machine.workspace }
    membership { association :membership, workspace: workspace }
    status { "confirmed" }
    transient do
      starts_at { workspace.zone.local(2026, 3, 11, 10) }
    end
    period { starts_at...(starts_at + machine.slot_minutes.minutes) }
    confirmed_at { status == "confirmed" ? starts_at - 1.day : nil }
    hold_expires_at { status == "held" ? Time.current + 5.minutes : nil }
  end
end
