# Run the tests

Needs Postgres reachable through the `PG*` variables, Ruby 3.4 (`api/.ruby-version`) and Node 22.12 or later (see [configuration](../reference/configuration.md)).

```bash
make verify        # everything below, in order: the gate
make api-verify    # RuboCop, then RSpec with the 90% coverage floor
make web-verify    # ESLint (with the TSDoc rule), Knip, Prettier, tsc, Vitest with coverage, both builds
make e2e           # Playwright: Rails + both built apps + a fresh booking_kiosk_e2e database
```

Single suites:

```bash
cd api && bundle exec rspec spec/services/concurrency_spec.rb
cd web && npx vitest run --project unit
cd web && npx vitest run --project component
cd web && npx playwright test e2e/member.spec.ts
cd web && npx playwright test --project tablet   # only the @tablet smoke tests at 768 × 1024
```

Playwright has three projects: `desktop` (every test except `@tablet` ones), `mobile` (Pixel 7 emulation, tests tagged `@mobile`) and `tablet` (768 × 1024 with touch, tests tagged `@tablet`). The layout checks in `e2e/responsive.spec.ts` set phone and tablet viewports themselves and run in the `desktop` project.

If Chromium is not installed yet: `cd web && npx playwright install chromium`. To use a shared browser download, set `PLAYWRIGHT_BROWSERS_PATH`.

What each suite proves, and the current counts: [testing/strategy.md](../testing/strategy.md).

## Optional: Brakeman

[Brakeman](https://github.com/presidentbeef/brakeman) is not a project dependency, because its licence is not one of the permissive licences this project accepts. To run it once without installing anything into the repository or your global gems:

```bash
export GEM_HOME="$(mktemp -d)"
gem install brakeman --no-document
cd api && "$GEM_HOME/bin/brakeman" --no-pager -q
```

Last run 2026-10-17 with Brakeman 8.1.0: 0 security warnings, 0 errors.
