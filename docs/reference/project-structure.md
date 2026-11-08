# Project structure

```text
booking-kiosk/
├── api/                         Rails 8.1 API (GraphQL)
│   ├── app/
│   │   ├── controllers/         GraphqlController: JSON only, origin check, query length, session token, logging
│   │   ├── graphql/             BookingKioskSchema, types/, mutations/ (thin: call Tenant and services), connections/
│   │   ├── jobs/                DeliverMessageJob (after-commit delivery)
│   │   ├── mailers/             MessageMailer (plain text from the outbox)
│   │   ├── models/              Active Record models plus Tenant, Policy, MessageRenderer, RateLimiter, ClientAddress, DomainError
│   │   └── services/
│   │       ├── bookings/        One class per state change; Availability; SlotRules; LapseExpiredHolds
│   │       ├── messages/        Enqueue (render and record) and Deliver (claim, send, record)
│   │       └── teams/           ChangeRole and Remove, under the shared team rules
│   ├── config/                  Environment-driven settings, session cookie, response headers, log filters
│   ├── db/                      Migrations (with header comments), schema.rb, seeds.rb
│   ├── lib/tasks/booking_kiosk.rake      booking_kiosk:tick and booking_kiosk:schema:dump
│   ├── schema.graphql           Generated SDL, committed; CI fails when stale
│   └── spec/                    RSpec: db, models, services, messages, requests, graphql, tasks, release
├── web/                         npm workspaces
│   ├── apps/member/             Booking grid, hold tray, my bookings, manager pages, account and invitation pages
│   ├── apps/kiosk/              Front-desk list
│   ├── public/                  Shared static files: favicon, theme-init.js
│   ├── vite.app.ts              The Vite configuration both apps re-export
│   ├── packages/api/            Typed GraphQL documents, generated types (src/generated), Apollo client, server clock
│   ├── packages/ui/             Design tokens, shared components, time helpers, hooks
│   ├── tests/unit/              Vitest in Node
│   ├── tests/component/         Vitest browser mode in Chromium
│   ├── e2e/                     Playwright against the full stack
│   └── security-headers.ts      Response headers for the Vite servers
├── docs/                        This documentation (Diátaxis), ADRs, security, testing
├── .github/                     CI, Scorecard, dependency review, Dependabot, templates
├── docker-compose.yml           One-command start
└── Makefile                     setup, dev, verify
```

## Dependency rules

| Layer | May depend on | Must not |
|---|---|---|
| GraphQL types and mutations | `Tenant`, services, models through `Tenant` | call `Model.find` or `Model.where` for workspace data |
| Services (`app/services`) | `Tenant`, models, `DomainError`, `Messages::Enqueue` | read the GraphQL context or HTTP request |
| Mutations | the GraphQL context (current user, client address, sign-in callback) | reach the HTTP request directly |
| Models | Active Record, `DomainError` | know about GraphQL |
| `web/apps/*` | `@booking-kiosk/api`, `@booking-kiosk/ui`, React, Apollo, React Router | write GraphQL documents inline (an ESLint rule refuses `graphql-tag`) |
| `@booking-kiosk/ui` | `@booking-kiosk/api` (sign-in, sign-out, error helpers, server clock), React | import from an app |
| `@booking-kiosk/api` | Apollo, `graphql`, generated types | import from `@booking-kiosk/ui` or an app |

Generated files (`web/packages/api/src/generated/`, `api/schema.graphql`, `api/db/schema.rb`, lockfiles) are never edited by hand; regenerate them instead.
