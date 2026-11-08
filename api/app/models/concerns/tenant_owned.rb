# Marks a model whose records belong to exactly one workspace.
#
# Records are reached through `Tenant` (app/models/tenant.rb), which only
# exposes relations already filtered to one workspace. Composite foreign keys
# in the schema back this up: a child record cannot reference a parent from
# another workspace, even through a direct SQL insert.
module TenantOwned
  extend ActiveSupport::Concern

  included do
    belongs_to :workspace
    attr_readonly :workspace_id
  end
end
