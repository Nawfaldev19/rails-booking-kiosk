# Local workflow without Docker. Needs Ruby 3.4, Node 22.12+ and a Postgres you
# can reach through the standard PG* environment variables (see .env.example).

.PHONY: setup dev verify api-verify web-verify e2e

setup:
	cd api && bin/setup --reset
	cd web && npm ci && npx playwright install chromium

# API on :3300, member app on :5173, kiosk on :5174. Ctrl+C stops all three.
# The API believes X-Forwarded-For only from the two local Vite proxies.
dev:
	trap 'kill 0' EXIT; \
	(cd api && TRUSTED_PROXIES=127.0.0.1,::1 bin/rails server) & \
	(cd web && npm run dev:member) & \
	(cd web && npm run dev:kiosk) & \
	wait

api-verify:
	cd api && bundle exec rubocop && RAILS_ENV=test bin/rails db:prepare && bundle exec rspec

web-verify:
	cd web && npm run lint && npm run knip && npm run format:check && npm run typecheck && npm run test:coverage && npm run build

e2e:
	cd web && npm run test:e2e

verify: api-verify web-verify e2e
