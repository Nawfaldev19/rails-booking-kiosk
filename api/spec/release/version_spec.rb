require "rails_helper"

# One version number for the whole repository (Semantic Versioning), kept in
# step with the latest Keep a Changelog entry.
RSpec.describe "Release version" do
  let(:root) { Rails.root.join("..") }

  it "matches the latest CHANGELOG entry" do
    latest = root.join("CHANGELOG.md").read[/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/, 1]
    expect(latest).to eq(BookingKiosk::VERSION)
  end

  it "matches every web package" do
    manifests = %w[package.json apps/member/package.json apps/kiosk/package.json packages/api/package.json packages/ui/package.json]
    versions = manifests.to_h { |path| [ path, JSON.parse(root.join("web", path).read)["version"] ] }
    expect(versions.values.uniq).to eq([ BookingKiosk::VERSION ]), versions.inspect
  end
end
