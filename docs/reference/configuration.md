# Configuration reference

Every setting Booking Kiosk reads. Nothing loads [`.env.example`](../../.env.example) automatically: export what you want to change before `make dev`. No real secret is needed to run the demo.

## API (Rails)

| Name | Default | Description | Read in |
|---|---|---|---|
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` | libpq defaults | Postgres connection for development and test (required outside Docker). | [`database.yml`](../../api/config/database.yml) |
| `BOOKING_KIOSK_DATABASE` | `booking_kiosk_development` | Development database name; the end-to-end suite sets `booking_kiosk_e2e`. | [`database.yml`](../../api/config/database.yml) |
| `DATABASE_URL` | none | Production connection string (required in production). | [`database.yml`](../../api/config/database.yml) |
| `DB_POOL` | `12` | Connection pool size per process. | [`database.yml`](../../api/config/database.yml) |
| `PORT`, `RAILS_MAX_THREADS`, `PIDFILE` | `3300`, `5`, none | Puma settings. | [`puma.rb`](../../api/config/puma.rb) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174` | Browser origins allowed to call `/graphql`; any other `Origin` gets 403. | [`application.rb`](../../api/config/application.rb) |
| `TRUSTED_PROXIES` | empty | Comma-separated addresses or CIDR ranges whose `X-Forwarded-For` is believed for the per-address sign-in limit. Empty means the socket peer is the client. `make dev` and the end-to-end suite set `127.0.0.1,::1`; Docker Compose lists the two app containers. A production proxy listed here must overwrite the header, not append to it. | [`application.rb`](../../api/config/application.rb), [`client_address.rb`](../../api/app/models/client_address.rb) |
| `MEMBER_APP_URL` | `http://localhost:5173` | Origin used in invitation links. | [`enqueue.rb`](../../api/app/services/messages/enqueue.rb) |
| `SESSION_COOKIE_SECURE` | `true` in production | Adds `Secure` to the session cookie. | [`application.rb`](../../api/config/application.rb) |
| `MAIL_FROM` | `Booking Kiosk <no-reply@booking-kiosk.example.com>` | Sender of outbox messages. | [`application_mailer.rb`](../../api/app/mailers/application_mailer.rb) |
| `MAIL_DELIVERY` | `smtp` (production) | `file` writes mail to `tmp/mails` instead; development always writes files. | [`production.rb`](../../api/config/environments/production.rb) |
| `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | none, `587` | SMTP server for production. Without `SMTP_ADDRESS` (and without `MAIL_DELIVERY=file`) production refuses to boot. | [`production.rb`](../../api/config/environments/production.rb) |
| `SECRET_KEY_BASE` | generated in development and test | Encrypts the session cookie and signs session tokens (required in production). | Rails |
| `RAILS_ASSUME_SSL`, `RAILS_FORCE_SSL` | `true` | Production TLS behaviour; `/up` is exempt from the redirect. | [`production.rb`](../../api/config/environments/production.rb) |
| `RAILS_LOG_LEVEL`, `APP_HOST` | `info`, `localhost` | Production log level and mail link host. | [`production.rb`](../../api/config/environments/production.rb) |
| `CI` | unset | Eager-loads the app in tests so load errors fail the suite. | [`test.rb`](../../api/config/environments/test.rb) |

## Constants in code

| Name | Value | Where |
|---|---|---|
| `Workspace::BOOKING_HORIZON_DAYS` | 14 (today plus 13) | [`workspace.rb`](../../api/app/models/workspace.rb) |
| Workspace `hold_minutes`, `max_active_holds` | 5 (1–60), 3 (1–20), by check constraint | [`schema.rb`](../../api/db/schema.rb) |
| `RateLimiter` budgets | 10 failed attempts per account and 50 per address per 5 minutes; 20 invitations per workspace per hour | [`rate_limiter.rb`](../../api/app/models/rate_limiter.rb) |
| Session lifetime | 2 hours idle; `User::SESSION_LIFETIME` 12 hours from sign-in | [`application.rb`](../../api/config/application.rb), [`user.rb`](../../api/app/models/user.rb) |
| `Invitation::LIFETIME` | 72 hours | [`invitation.rb`](../../api/app/models/invitation.rb) |
| `OutboundMessage::MAX_ATTEMPTS`, `SEND_LEASE` | 5 attempts, 5-minute lease | [`outbound_message.rb`](../../api/app/models/outbound_message.rb) |
| Template limits | subject 160, body 5,000 characters | [`message_renderer.rb`](../../api/app/models/message_renderer.rb) |
| Request limits | query 10,000 characters and 1,000 tokens, depth 10, complexity 400, page size 20 (max 50) | [`graphql_controller.rb`](../../api/app/controllers/graphql_controller.rb), [`booking_kiosk_schema.rb`](../../api/app/graphql/booking_kiosk_schema.rb) |
| `Regexp.timeout` | 1 second | [`regexp_timeout.rb`](../../api/config/initializers/regexp_timeout.rb) |
| `BookingKiosk::VERSION` | the release version | [`application.rb`](../../api/config/application.rb) |

## Web (Vite)

| Name | Default | Description | Read in |
|---|---|---|---|
| `BOOKING_KIOSK_API_URL` | `http://localhost:3300` | Where the dev and preview servers forward `/graphql`. | [`vite.app.ts`](../../web/vite.app.ts) |
| `CI` | unset | Playwright forbids `test.only` and uses the GitHub reporter. | [`playwright.config.ts`](../../web/playwright.config.ts) |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright's cache | Where Playwright looks for Chromium. | Playwright |

The Vite servers' response headers are in [`security-headers.ts`](../../web/security-headers.ts); a production reverse proxy must send the same, because `vite preview` is not a production server.

## Ports

| Port | What |
|---|---|
| 3300 | API (development, Docker Compose) |
| 5173, 5174 | Member and kiosk dev servers |
| 3301, 5273, 5274 | API and preview servers started by the end-to-end suite |
