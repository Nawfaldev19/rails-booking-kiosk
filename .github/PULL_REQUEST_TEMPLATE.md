## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `make verify` passes locally (RuboCop, RSpec, ESLint, Knip, Prettier, `tsc`, Vitest, builds, Playwright).
- [ ] Tests added or updated for the change, at the lowest level that proves it.
- [ ] Docs updated: the feature's entry in `docs/reference/features.md`, `docs/testing/traceability.md`, an ADR in `docs/adr/` if a decision was made, and `CHANGELOG.md`.
- [ ] If the GraphQL schema changed: `bin/rails booking_kiosk:schema:dump` and `npm run codegen` were run, and every new element has a description.
- [ ] Accessibility considered: keyboard path, focus after the action, announcements, contrast (WCAG 2.2 AA).
- [ ] Security considered: authorisation through `Tenant`, input limits, no secrets or personal data in logs.
- [ ] Commit messages follow Conventional Commits.
