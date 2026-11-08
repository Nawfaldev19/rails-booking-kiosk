module Types
  # The parts of a workspace safe to show in a workspace switcher.
  class WorkspaceSummaryType < BaseObject
    graphql_name "WorkspaceSummary"
    description "Public facts about a workspace the viewer belongs to."
    field :name, String, "Display name.", null: false
    field :slug, String, "URL-safe identifier used in `/w/:slug` and `workspace(slug:)`.", null: false
  end
end
