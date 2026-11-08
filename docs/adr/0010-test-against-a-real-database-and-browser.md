---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Test against a real database and a real browser

## Context and Problem Statement

Concurrency, constraint and tenancy bugs hide behind mocks. What should the test suites run against?

## Decision Drivers

* The suites must prove the properties the README claims.
* Tests must be deterministic (pinned clock, no retries).

## Considered Options

* Real Postgres for RSpec, real Chromium for component and end-to-end tests
* Mocked persistence and jsdom

## Decision Outcome

Chosen option: "Real Postgres and real Chromium", because only they exercise exclusion constraints, record locks and real rendering.

* RSpec runs against Postgres. Constraint specs bypass the models.
* Concurrency specs use real threads and real commits.
* Request specs drive the HTTP endpoint with cookies.
* Front-end component tests run in Chromium with only the network mocked.
* Playwright runs the full stack against a dedicated, freshly seeded database.

### Consequences

* Good, because the suites prove the claimed properties. They found two real bugs during development: a daylight-saving offset error in opening hours, and empty ranges slipping past a check constraint.
* Bad, because the suites are slower than pure unit tests and need Postgres and a browser download.

### Confirmation

`make verify` runs every suite; counts are in [testing/strategy.md](../testing/strategy.md).

## Pros and Cons of the Options

### Real database and browser

* Good, because they test what ships.
* Bad, because they need more setup.

### Mocks and jsdom

* Good, because they are fast.
* Bad, because constraints, locks and layout are not exercised.

## More Information

Traceability from features to tests: [testing/traceability.md](../testing/traceability.md).
