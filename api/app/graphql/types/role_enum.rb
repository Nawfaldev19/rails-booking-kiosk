module Types
  # Roles map to capabilities in Policy::RULES.
  class RoleEnum < BaseEnum
    graphql_name "Role"
    description "A person's role inside one workspace."
    value "MEMBER", "Books machines.", value: "member"
    value "STAFF", "Runs the front-desk kiosk.", value: "staff"
    value "MANAGER", "Books, runs the kiosk and manages the workspace.", value: "manager"
  end
end
