# Third-party notices

Booking Kiosk's own code is MIT-licensed (see `LICENSE`). Versions below are from `api/Gemfile.lock` and `web/package-lock.json` at the time of writing.

## API (Ruby gems, direct)

| Gem | Version | Licence |
|---|---|---|
| rails | 8.1.4 | MIT |
| pg | 1.7.0 | BSD-2-Clause |
| puma | 8.0.2 | BSD-3-Clause |
| bcrypt | 3.1.22 | MIT |
| graphql | 2.6.12 | MIT |
| liquid | 5.14.0 | MIT |
| tzinfo-data (Windows/JRuby only) | — | MIT |
| debug (development/test) | 1.11.1 | Ruby or BSD-2-Clause |
| rspec-rails (development/test) | 8.0.4 | MIT |
| factory_bot_rails (development/test) | 6.5.1 | MIT |
| rubocop-rails-omakase (development/test) | 1.1.0 | MIT |
| simplecov (test) | 1.2.0 | MIT |

**Transitive gems with multiple-choice licences.** An audit of every gem in the bundle found only MIT, BSD-2/3-Clause, Apache-2.0 and Ruby-licence gems, plus two offered under a choice of licences. Booking Kiosk uses each under its permissive option:

| Gem | Offered under | Used under | Pulled in by |
|---|---|---|---|
| diff-lcs | MIT, Artistic-1.0-Perl or GPL-2.0-or-later | MIT | rspec (tests only) |
| rdoc | Ruby or GPL-2.0 | Ruby licence | Rails' console tooling |

## Web (npm packages, direct)

| Package | Version | Licence | Shipped to browsers |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | yes |
| @apollo/client | 4.3.4 | MIT | yes |
| graphql | 16.14.2 | MIT | yes |
| rxjs | 7.8.2 | Apache-2.0 | yes |
| react-router | 7.18.4 | MIT | yes |
| lucide-react | 1.58.0 | ISC | yes |
| @fontsource-variable/bricolage-grotesque | 5.3.0 | SIL OFL 1.1 (font), MIT (packaging) | yes |
| @fontsource/atkinson-hyperlegible | 5.3.0 | SIL OFL 1.1 (font), MIT (packaging) | yes |
| @fontsource-variable/jetbrains-mono | 5.3.0 | SIL OFL 1.1 (font), MIT (packaging) | yes |
| typescript | 6.0.3 | Apache-2.0 | no |
| vite, @vitejs/plugin-react | 8.3.4, 6.1.2 | MIT | no |
| vitest, @vitest/browser, @vitest/browser-playwright, @vitest/coverage-v8 | 5.0.5 | MIT | no |
| vitest-browser-react | 2.3.0 | MIT | no |
| playwright, @playwright/test | 1.64.1 | Apache-2.0 | no |
| @graphql-codegen/cli, @graphql-codegen/client-preset | 7.4.6, 6.2.3 | MIT | no |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | 10.x / 8.x | MIT | no |
| eslint-plugin-jsdoc | 65.0.2 | BSD-3-Clause | no |
| prettier | 3.9.10 | MIT | no |
| knip | 6.41.0 | ISC | no |

**Transitive development packages with other licences** (none ship to browsers):

| Package | Licence | Pulled in by |
|---|---|---|
| lightningcss (+ platform binary) | MPL-2.0 (file-level copyleft; applies only to modified copies of its own files) | vite |
| caniuse-lite | CC-BY-4.0 | browserslist |
| minimatch | BlueOak-1.0.0 (permissive) | eslint and others |
| spdx-exceptions | CC-BY-3.0 (licence-identifier data) | eslint-plugin-jsdoc |
| spdx-license-ids | CC0-1.0 (licence-identifier data) | eslint-plugin-jsdoc |

## Fonts and icons

- Bricolage Grotesque, Atkinson Hyperlegible and JetBrains Mono are under the SIL Open Font License 1.1 (<https://openfontlicense.org>). They are self-hosted from the Fontsource packages.
- Lucide icons are under the ISC licence (<https://lucide.dev/license>). The Booking Kiosk logo is original SVG.
