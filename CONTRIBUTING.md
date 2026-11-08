# Contributing to Booking Kiosk

Thanks for helping. Booking Kiosk is a small demo project, so changes are reviewed on a best-effort basis.

## Setup

You need Ruby 3.4 (`api/.ruby-version`), Node 22.12 or later (`.nvmrc` pins the version CI uses) and PostgreSQL 14 or later reachable through the `PG*` variables, or Docker for `docker compose up`.

```bash
make setup    # bin/setup --reset in api/, npm ci and Chromium in web/
make dev      # API :3300, member :5173, kiosk :5174
make verify   # the gate every change must pass
```

Single commands, the folder map and security boundaries are below; settings are in [configuration.md](docs/reference/configuration.md).

## Single commands

Postgres must be reachable through `PG*` variables. Run Ruby commands from `api/` with `bundle exec` (gems install into `api/vendor/bundle`).

```bash
cd api && bundle exec rubocop                # Ruby lint
cd api && bundle exec rspec                  # API specs, 90% line-coverage floor
cd api && bin/rails booking_kiosk:schema:dump         # regenerate api/schema.graphql after schema changes
cd web && npm run lint                       # ESLint, zero warnings, TSDoc required on exports
cd web && npm run knip                       # unused files, exports, dependencies
cd web && npm run format:check               # Prettier (npm run format to fix)
cd web && npm run typecheck                  # tsc -b
cd web && npm run test:coverage              # Vitest unit (Node) + component (Chromium)
cd web && npm run build                      # both apps
cd web && npm run codegen                    # regenerate client types from api/schema.graphql
cd web && npm run test:e2e                   # Playwright on the full stack (ports 3301, 5273, 5274)
```

## Folder map

| Path | What |
|---|---|
| `api/app/graphql` | schema, types, mutations (thin; call `Tenant` and services) |
| `api/app/services` | one class per booking state change; team changes; outbox enqueue and delivery |
| `api/app/models` | models plus `Tenant`, `Policy`, `MessageRenderer`, `RateLimiter`, `ClientAddress`, `DomainError` |
| `api/db/migrate` | migrations, each starting with a what-and-why comment |
| `api/spec` | RSpec by layer |
| `web/packages/api/src/operations` | every GraphQL document the apps use |
| `web/packages/ui/src` | shared components, hooks, time helpers, design tokens |
| `web/apps/*/src` | the two apps |
| `web/tests`, `web/e2e` | Vitest and Playwright |
| `docs/` | documentation; see [docs/README.md](docs/README.md) |

## Conventions

- Naming: Ruby `snake_case`, GraphQL `camelCase` fields and `SCREAMING_CASE` enum values, React components in `PascalCase.tsx`, hooks `useThing.ts`.
- Expected failures are `DomainError.new(CODE, message, field:)` with a code from `Types::ErrorCodeEnum`; mutations return them in `errors`.
- Generated files are never edited by hand: `web/packages/api/src/generated/**` (`npm run codegen`), `api/schema.graphql` (`bin/rails booking_kiosk:schema:dump`), `api/db/schema.rb` (write a migration), and the lockfiles (`npm install` / `bundle install`).

## Security boundaries

- Never commit secrets or `.env` files. Never log passwords, tokens or GraphQL variables.
- Reach workspace data only through `Tenant` (`tenant.machines`, `tenant.bookings`, …), never `Model.find`/`Model.where` in resolvers or services. Start every service and resolver with `tenant.authorize!(:capability)`.
- Use Active Record with bound parameters (`where("x > ?", value)`); never interpolate input into SQL.
- Keep validation in its documented place: models, `Bookings::SlotRules`, `MessageRenderer`, and database constraints. Clients never decide what is valid.
- Do not weaken the response headers in `api/config/application.rb` or `web/security-headers.ts`, the origin check, or the Liquid restrictions.
- Seed data stays fictional; emails use `example.com`.
- New dependencies must be permissively licensed (MIT, Apache-2.0, BSD, ISC) and listed in `THIRD_PARTY_NOTICES.md`.

## Definition of done

`make verify` passes with zero warnings, RuboCop is clean, coverage stays at or above the floor, the SDL and generated types are up to date, and the docs listed under "Docs as code" are updated.

## Branches and commits

- Branch from `main` (`feat/hold-reminders`, `fix/kiosk-search`).
- Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `feat(member): …`, `fix(api): …`, `docs: …`, `test(e2e): …`. Mark incompatible API changes with `!` or a `BREAKING CHANGE:` footer.
- One logical change per pull request, using the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).

## Code style

- RuboCop (`rubocop-rails-omakase`); ESLint with `typescript-eslint` strict type-checked rules, Prettier and strict `tsc`.
- **Doc comments are required, and enforced:** TSDoc on every export in `web/apps/*/src` and `web/packages/*/src` (`eslint-plugin-jsdoc`), a `description` on every GraphQL type, field, argument and enum value ([`schema_descriptions_spec.rb`](api/spec/graphql/schema_descriptions_spec.rb)), YARD tags on public Ruby classes and methods, and a header comment on every migration. Comments explain why, not what.
- Never edit generated files: run `bin/rails booking_kiosk:schema:dump` and `npm run codegen`.

## Tests

Test at the lowest level that proves the behaviour: constraint specs for invariants, service specs for rules, request specs for API behaviour and isolation, Vitest for logic and UI behaviour, Playwright only for whole journeys. Pin time and never add retries. See [the test strategy](docs/testing/strategy.md).

## Docs as code

A feature change also updates, in the same pull request, its entry in the [feature catalogue](docs/reference/features.md), an [ADR](docs/adr/README.md) when it makes or changes a decision, [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`, and the counts in [docs/testing/strategy.md](docs/testing/strategy.md), the only place they are recorded.

## Conduct and security

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), never in an issue.
