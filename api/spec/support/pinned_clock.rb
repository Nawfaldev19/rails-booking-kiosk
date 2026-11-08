# Every example runs at Tuesday 10 March 2026, 12:00 UTC (12:00 in London too),
# so no result depends on the day the suite happens to run. Examples move the
# clock with `travel` or `travel_to` (without a block) when they need to.
module PinnedClock
  NOW = Time.utc(2026, 3, 10, 12)
end

RSpec.shared_context "pinned clock" do
  let(:now) { PinnedClock::NOW }

  around { |example| travel_to(PinnedClock::NOW) { example.run } }
end

RSpec.configure { |config| config.include_context "pinned clock" }
