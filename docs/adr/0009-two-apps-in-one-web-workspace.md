---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Two apps, one npm workspace for the web

## Context and Problem Statement

Members and front-desk staff have different jobs, devices and risk profiles. Should the front desk be a tab in the member app or an app of its own?

## Decision Drivers

* A shared front-desk terminal should not ship manager code.
* Shared components and types should not drift between apps.
* Each app should stay small.

## Considered Options

* Two Vite apps sharing workspace packages
* One app with role-based routes
* Two separate repositories

## Decision Outcome

Chosen option: "Two Vite apps sharing workspace packages", because it keeps each bundle focused while sharing one UI kit and one typed API package.

* `apps/member` and `apps/kiosk` share `packages/ui` and `packages/api` through npm workspaces, and one Vite configuration and public folder (`web/vite.app.ts`, `web/public`).
* The API, not the client, enforces roles; client role checks only shape the UI.

### Consequences

* Good, because each app stays small and focused, and shared types and components avoid drift.
* Bad, because there are two dev servers and two builds to run.

### Confirmation

* [`web/e2e/kiosk.spec.ts`](../../web/e2e/kiosk.spec.ts) checks members are refused by the kiosk.
* `npm run knip` fails on unused files or exports across the workspace.

## Pros and Cons of the Options

### Two apps

* Good, because of focused bundles and separate risk profiles.
* Bad, because of slightly more build configuration.

### One app

* Good, because there is one build.
* Bad, because the kiosk would ship manager pages to a shared device.

### Two repositories

* Good, because they are fully independent.
* Bad, because shared code would need publishing and versioning.

## More Information

Project layout: [reference/project-structure.md](../reference/project-structure.md).
