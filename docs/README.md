# Documentation

Organised by [Diátaxis](https://diataxis.fr): tutorials to learn, how-to guides for a task, reference to look things up, explanation to understand why.

| Kind | Pages |
|---|---|
| Tutorial | [Getting started: your first booking](tutorials/getting-started.md) |
| How-to | [Run the tests](how-to/run-the-tests.md) · [Reset the demo data](how-to/reset-demo-data.md) · [Audit accessibility](how-to/audit-accessibility.md) · [Add a GraphQL mutation](how-to/add-a-graphql-mutation.md) · [Add a message placeholder](how-to/add-a-message-placeholder.md) · [Report a vulnerability](how-to/report-a-vulnerability.md) · [Enable the repository's security features](how-to/enable-repository-security-features.md) |
| Reference | [Features](reference/features.md) · [GraphQL API](reference/api.md) · [Data model](reference/data-model.md) · [Configuration](reference/configuration.md) · [Design tokens](reference/design-tokens.md) · [Project structure](reference/project-structure.md) · [Glossary](reference/glossary.md) |
| Explanation | [Architecture](explanation/architecture.md) · [Concurrency and holds](explanation/concurrency-and-holds.md) · [Scope](explanation/scope.md) · [References](explanation/references.md) · [Decision records](adr/README.md) |
| Security | [Threat model](security/threat-model.md) · [ASVS 5.0.0 mapping](security/asvs-mapping.md) · [Supply chain](security/supply-chain.md) · [Policy](../SECURITY.md) |
| Testing | [Strategy, counts and coverage](testing/strategy.md) · [Traceability](testing/traceability.md) |

## Conventions

| Area | Standard |
|---|---|
| Documentation | [Diátaxis](https://diataxis.fr) |
| Architecture | [arc42](https://arc42.org) (light) with [C4](https://c4model.com) diagrams in Mermaid |
| Decisions | [MADR 4.0.0](https://adr.github.io/madr/) |
| Changelog and versions | [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html); one version, checked by a spec |
| Commits | [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) |
| Security | [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/) at chapter level; STRIDE per trust boundary; [OpenSSF Scorecard](https://github.com/ossf/scorecard/blob/main/docs/checks.md) checks |
| Accessibility | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA as the target; [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) |
| Code documentation | [TSDoc](https://tsdoc.org) (lint-enforced), [YARD](https://rubydoc.info/gems/yard/file/docs/Tags.md), a description on every GraphQL element (spec-enforced) |
