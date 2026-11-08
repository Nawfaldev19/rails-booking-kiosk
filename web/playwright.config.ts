import { defineConfig, devices } from '@playwright/test';

// The end-to-end suite runs the real stack: Rails on its own database, plus
// production builds of both apps served by `vite preview` (which proxies /graphql).
const API_PORT = 3301;
const api = `http://localhost:${API_PORT}`;
const appEnv = { BOOKING_KIOSK_API_URL: api };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // No retries: the suite shares one seeded database, so a retry would not start clean.
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
      grepInvert: /@tablet/,
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chromium' }, grep: /@mobile/ },
    {
      // Between the phone (< 760px) and desktop layouts; touch, but not a mobile viewport.
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
      grep: /@tablet/,
    },
  ],
  webServer: [
    {
      command: `cd ../api && bin/rails db:prepare && bin/rails db:seed:replant && bin/rails server -p ${API_PORT} --pid tmp/pids/e2e-server.pid`,
      url: `${api}/up`,
      env: {
        BOOKING_KIOSK_DATABASE: 'booking_kiosk_e2e',
        RAILS_LOG_LEVEL: 'warn',
        ALLOWED_ORIGINS: 'http://localhost:5273,http://localhost:5274',
        // The local preview servers proxy /graphql and set X-Forwarded-For.
        TRUSTED_PROXIES: '127.0.0.1,::1',
        MEMBER_APP_URL: 'http://localhost:5273',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'npm run build --workspace @booking-kiosk/member && npm run preview --workspace @booking-kiosk/member',
      port: 5273,
      env: appEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'npm run build --workspace @booking-kiosk/kiosk && npm run preview --workspace @booking-kiosk/kiosk',
      port: 5274,
      env: appEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
