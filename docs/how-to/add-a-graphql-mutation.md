# Add a GraphQL mutation

Example: a mutation `renameWorkspace(name:)` for managers.

1. **Decide the capability.** Add it to [`Policy::RULES`](../../api/app/models/policy.rb) if no existing one fits, for example `manage_workspace: %w[manager]`.
2. **Write the service or the logic.** For anything beyond one update, add a class under `api/app/services/` that takes a `Tenant`, starts with `@tenant.authorize!(:capability)`, raises `DomainError.new(CODE, message, field:)` for expected failures, and reaches data only through the tenant. Give the class and its public methods YARD comments (`@param`, `@return`, `@raise`).
3. **Add the mutation class** in `api/app/graphql/mutations/`, inheriting from `BaseMutation` (or `BookingMutation` / `MachineMutation` when it returns one of those):

   ```ruby
   module Mutations
     # Renames the current workspace.
     #
     # Auth: managers. Errors: UNAUTHENTICATED, FORBIDDEN, INVALID_INPUT.
     class RenameWorkspace < BaseMutation
       description "Renames the workspace. Managers only."

       argument :name, String, "Up to 80 characters.", required: true

       field :workspace, Types::WorkspaceType, "The renamed workspace.", null: true

       # @param name [String]
       # @return [Hash] the payload's `workspace`.
       def perform(name:)
         tenant!.authorize!(:manage_workspace)
         tenant!.workspace.update!(name: name)
         { workspace: tenant!.workspace }
       end
     end
   end
   ```

   `BaseMutation` turns `DomainError` and validation failures into typed `errors`. Every argument and field needs a description, or [`schema_descriptions_spec.rb`](../../api/spec/graphql/schema_descriptions_spec.rb) fails. A new error code goes into [`ErrorCodeEnum`](../../api/app/graphql/types/error_code_enum.rb) with its description.
4. **Register it** in [`MutationType`](../../api/app/graphql/types/mutation_type.rb): `field :rename_workspace, mutation: Mutations::RenameWorkspace`.
5. **Test it** with a request spec (happy path, each error code, and an isolation attack from another workspace in [`tenant_isolation_spec.rb`](../../api/spec/requests/tenant_isolation_spec.rb)).
6. **Dump the schema:** `cd api && bin/rails booking_kiosk:schema:dump`, and review the `schema.graphql` diff.
7. **Add the client document** in `web/packages/api/src/operations/` with a TSDoc comment, then `cd web && npm run codegen`. Never edit `src/generated/` directly.
8. **Use it** in an app through `useMutation`, handle `errors` with `firstUserError` or `useAction`, and add a component test.
9. **Document it:** the feature's entry in [features.md](../reference/features.md), [api.md](../reference/api.md) and `CHANGELOG.md`, and [traceability.md](../testing/traceability.md) if a new test file covers it.
10. **Run the gate:** `make verify`.
