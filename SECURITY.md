# Security policy

Booking Kiosk is a personal demo project maintained on a best-effort basis. Reports are welcome and taken seriously.

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | yes |

## Reporting a vulnerability

Please **do not open a public issue**. Use the repository's **Security → Report a vulnerability** form ([open it](../../security/advisories/new)).

Include what is affected (API, member app, kiosk, CI, Compose) and the version or commit, steps to reproduce against the seeded demo data, the impact you see, and any proof-of-concept request with personal data removed.

## What to expect

Goals, not guarantees: acknowledgement within 5 working days, an initial assessment within 10, then a fix and a disclosure date agreed with you, with credit if you want it.

## Scope

In scope: the code in this repository. Out of scope: the fictional demo accounts and their public password `booking-kiosk-demo-pass`; findings that need a production setup this repository does not provide (TLS, reverse proxy, mail provider), unless its guidance is wrong; volume-based denial of service, including the documented five-minute pause of one account's sign-in; dependency vulnerabilities with no exploit path here (see [supply-chain.md](docs/security/supply-chain.md)).

## Safe harbour

Good-faith research that follows this policy, avoids privacy violations and service disruption, and uses only your own copy or the demo data will not be pursued or reported by the maintainer.

Design notes: [threat model](docs/security/threat-model.md).
