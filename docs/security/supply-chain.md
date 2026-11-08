# Supply-chain security

Structured after the [OpenSSF Scorecard checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md).

## Dependency policy

- **Permissive licences only** (MIT, Apache-2.0, BSD, ISC); every direct dependency and the exceptions in the transitive tree are listed in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
- **Lockfiles are committed** (`api/Gemfile.lock`, `web/package-lock.json`) and installs are reproducible: `bundle install` with the lockfile, `npm ci`.
- **Runtimes are current:** Ruby 3.4 (`api/.ruby-version`, the Compose image `ruby:3.4.11`) and Node 24 (`.nvmrc`; `engines` accepts 22.12 or later).
- **New dependencies are rare.** Prefer the standard library and existing packages; a new one needs a reason in the pull request and an entry in the notices.

## Controls

| Scorecard check | What this repository does |
|---|---|
| Token-Permissions | Every workflow sets `permissions: contents: read` at the top; write permissions appear only on the job that needs them (Scorecard: `id-token: write` to publish). |
| Pinned-Dependencies | Every action is pinned to a full commit SHA with the version as a comment. Postgres service images in CI and the images in Docker Compose use version tags; Dependabot proposes updates for both. |
| Dependency-Update-Tool | [Dependabot](../../.github/dependabot.yml): npm (`/web`), bundler (`/api`), GitHub Actions (`/`) and Docker Compose images (`/`), weekly, with minor and patch updates grouped. |
| SAST | CodeQL for JavaScript/TypeScript, Ruby and GitHub Actions, through GitHub's default setup ([how-to](../how-to/enable-repository-security-features.md)). The gate also runs ESLint with `typescript-eslint` strict type-checked rules, RuboCop and Knip. |
| Security-Policy | [SECURITY.md](../../SECURITY.md) with private vulnerability reporting. |
| License | [LICENSE](../../LICENSE) (MIT). |
| CI-Tests | [`ci.yml`](../../.github/workflows/ci.yml) runs the full gate on pushes to `main` and on pull requests. |
| Dangerous-Workflow | No `pull_request_target`, no untrusted input interpolated into `run:` scripts, `persist-credentials: false` on every checkout. |
| SBOM | The `supply-chain` CI job writes a CycloneDX SBOM of the web workspace (`npm sbom --sbom-format cyclonedx`) and keeps it as an artifact for 30 days. |
| Binary-Artifacts | No binaries are committed (the four PNG screenshots in `docs/assets/` are images, not executables). |

[Dependency review](../../.github/workflows/dependency-review.yml) runs on every pull request and fails on a new dependency with a high or critical advisory. [Scorecard](../../.github/workflows/scorecard.yml) runs on pushes to `main` and weekly and publishes its results. Uploading Scorecard's SARIF to GitHub's code-analysis alerts would need one more job permission and is left out; the SARIF is kept as an artifact instead.

## Ruby advisories and static analysis

Ruby gem advisories come from **Dependabot alerts** on `api/Gemfile.lock`. `bundler-audit` (GPL-3.0) and Brakeman (its licence is not on the permissive list) are not project dependencies. Brakeman can still be run ad hoc from a throwaway gem directory ([how-to](../how-to/run-the-tests.md#optional-brakeman)); the last run, on 2026-10-17 with Brakeman 8.1.0, reported 0 warnings.

## Current npm audit status

Checked on 2026-10-17 with npm 11.4.2 in `web/`:

| Command | Result | In CI |
|---|---|---|
| `npm audit --omit=dev --audit-level=high` | **found 0 vulnerabilities** | blocking |
| `npm audit --audit-level=high` | **10 high** | report only |

All ten come from one advisory, **GHSA-vfj7-8cjw-p6xm** (stack exhaustion in `braces` up to 3.0.3 on deeply nested patterns), reached through `@graphql-codegen/cli` → `micromatch` → `braces`; npm lists every package on that path. `braces` 3.0.3 is the latest release, and `npm audit fix --force` would only downgrade the code generator by four major versions.

**Accepted risk:** the code generator runs only on developer machines and in CI, on the repository's own schema and glob patterns, never on untrusted input, and none of it ships to browsers (the production audit is clean). Dependabot will propose the fix when one is published.
