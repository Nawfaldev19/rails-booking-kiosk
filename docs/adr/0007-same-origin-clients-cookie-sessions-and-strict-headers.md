---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Same-origin clients, cookie sessions and strict response headers

## Context and Problem Statement

The two browser apps authenticate to the API and show personal data. Tokens in `localStorage` can be stolen by any XSS; cross-origin cookies need CORS and `SameSite=None`. The responses themselves can be framed, sniffed or cached unless headers say otherwise. How should the apps talk to the API, and what should every response carry?

## Decision Drivers

* No credential readable by JavaScript, and no CORS configuration to get wrong.
* Cross-site request forgery blocked by construction.
* Sessions end on their own, and a password change ends sessions elsewhere.
* JSON is never sniffed, rendered or framed; personal data is never cached; the built apps run under a Content Security Policy with no exceptions.

## Considered Options

* Same-origin requests through a proxy, encrypted HTTP-only `SameSite=Lax` cookies, strict headers with no `'unsafe-inline'`
* Bearer tokens in `localStorage`, Rails' default headers
* Cross-origin cookies with CORS and `SameSite=None`, a policy that allows `'unsafe-inline'`

## Decision Outcome

Chosen option: the first, because the session cookie is then first-party, JavaScript never sees a credential, and the apps load nothing from other origins and use no inline scripts or style attributes in markup.

* Both apps call `/graphql` on their own origin; Vite (or a reverse proxy in production) forwards it.
* The session cookie expires after two idle hours (the expiry is inside the encrypted cookie, so an old copy cannot be replayed). It holds a token from `generates_token_for(:session)` that stops working 12 hours after sign-in and as soon as the password changes. It is reset on sign-in and sign-out.
* The endpoint accepts only `application/json` and rejects unknown `Origin` headers.
* API headers (`config/application.rb`): `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, `Cross-Origin-Resource-Policy: same-origin`, Rails' `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` on `POST /graphql`.
* App headers (`web/security-headers.ts`): on the preview server, `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`, plus `nosniff`, `no-referrer`, `DENY`, `Cross-Origin-Opener-Policy: same-origin` and a `Permissions-Policy` that turns off camera, microphone, geolocation, payment and USB. The dev server sends the same without the policy, because hot reload injects an inline script. The saved theme is applied by `theme-init.js`, an external file, so it needs no exception either.

### Consequences

* Good, because there is no token handling in JavaScript, and a cross-site form cannot send `application/json` while a cross-site `fetch` with that type needs a preflight this API never approves.
* Good, because the end-to-end tests run under the same policy a production proxy should send.
* Bad, because a cookie session cannot be revoked server-side one by one; a password change revokes them all.
* Bad, because in development both apps share `localhost` cookies across ports, the `/up` page loses its inline colour, and a production reverse proxy must copy the app headers.

### Confirmation

* [`auth_and_transport_spec.rb`](../../api/spec/requests/auth_and_transport_spec.rb): 415 for non-JSON, 403 for foreign origins, session rotation, idle and absolute expiry; [`team_spec.rb`](../../api/spec/requests/team_spec.rb): other sessions end on a password change.
* [`security_headers_spec.rb`](../../api/spec/requests/security_headers_spec.rb) checks the API headers; [`security-headers.spec.ts`](../../web/e2e/security-headers.spec.ts) checks the app headers and fails on any policy violation during sign-in.

## Pros and Cons of the Options

### Same origin, cookies, strict headers

* Good, because credentials are invisible to scripts and the headers add defence in depth at no cost.
* Bad, because production needs a reverse proxy, and a future inline script would need a hash.

### Tokens in `localStorage`, default headers

* Good, because there is no proxy.
* Bad, because any XSS can exfiltrate the token, and framing and caching stay allowed.

### Cross-origin cookies, `'unsafe-inline'`

* Good, because apps and API can live on different hosts and the policy is easy to adopt.
* Bad, because `SameSite=None` and CORS widen the CSRF surface, and `'unsafe-inline'` removes most of the policy's XSS protection.

## More Information

* OWASP Cross-Site Request Forgery Prevention and HTTP Headers cheat sheets: <https://cheatsheetseries.owasp.org/>
* Threat model: [security/threat-model.md](../security/threat-model.md).
