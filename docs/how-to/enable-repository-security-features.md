# Enable the repository's security features (owner checklist)

These settings live in GitHub, not in files, so they must be switched on once by the repository owner after the first push. Paths are from the repository's **Settings**.

- [ ] **Private vulnerability reporting:** Settings → Code security → Private vulnerability reporting → Enable. [SECURITY.md](../../SECURITY.md) and the issue template point to it.
- [ ] **Dependabot alerts and security updates:** Settings → Code security → Dependabot alerts → Enable, and Dependabot security updates → Enable. Version updates are already configured in [`.github/dependabot.yml`](../../.github/dependabot.yml). Ruby advisories come from these alerts.
- [ ] **Dependency graph:** on by default for public repositories; required by dependency review.
- [ ] **CodeQL default setup:** Settings → Code security → CodeQL analysis → Set up → Default. Choose the languages **JavaScript/TypeScript**, **Ruby** and **GitHub Actions**, with the default query suite. The repository has no CodeQL workflow file; default setup runs on pushes, pull requests and a weekly schedule.
- [ ] **Secret protection and push protection:** Settings → Code security → Secret protection → Enable, then Push protection → Enable.
- [ ] **Branch protection (or a ruleset) for `main`:** Settings → Rules → Rulesets → New branch ruleset targeting `main`: require a pull request, require the status checks `api`, `web`, `e2e`, `supply-chain` and `dependency-review`, block force pushes and deletion.
- [ ] **Workflow permissions:** Settings → Actions → General → Workflow permissions → "Read repository contents and packages permissions" (the workflows already request only what they need).
- [ ] **Scorecard badge (optional):** once [`scorecard.yml`](../../.github/workflows/scorecard.yml) has run on `main`, add the badge from <https://scorecard.dev> to the README.
