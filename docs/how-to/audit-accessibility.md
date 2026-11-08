# Audit accessibility with axe-core

Runs [axe-core](https://github.com/dequelabs/axe-core) against the production builds of both apps. axe-core is not a project dependency, because its licence (MPL-2.0) is not one of the permissive licences this project accepts, so it is installed into a throwaway folder.

## 1. Start the built apps on a fresh database

```bash
cd api
BOOKING_KIOSK_DATABASE=booking_kiosk_audit bin/rails db:prepare db:seed:replant
BOOKING_KIOSK_DATABASE=booking_kiosk_audit ALLOWED_ORIGINS=http://localhost:5273,http://localhost:5274 \
  TRUSTED_PROXIES=127.0.0.1,::1 bin/rails server -p 3301 &
cd ../web && npm run build
BOOKING_KIOSK_API_URL=http://localhost:3301 npm run preview --workspace @booking-kiosk/member &
BOOKING_KIOSK_API_URL=http://localhost:3301 npm run preview --workspace @booking-kiosk/kiosk &
```

## 2. Install the audit tools outside the repository

```bash
export AUDIT="$(mktemp -d)" npm_config_cache="$(mktemp -d)"
cd "$AUDIT" && npm init -y && npm install @axe-core/playwright@4 playwright@1.64.1
```

Save this as `$AUDIT/audit.mjs`. It signs in with the demo buttons and checks every page in both colour schemes, plus the kiosk at phone width:

```js
// Runs axe-core against the built member and kiosk apps (preview servers on 5273 and 5274).
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const MEMBER = 'http://localhost:5273';
const KIOSK = 'http://localhost:5274';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const found = [];
let states = 0;

async function check(page, label) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  states += 1;
  for (const v of violations) found.push(`${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const browser = await chromium.launch({ channel: 'chromium' });
for (const colorScheme of ['light', 'dark']) {
  const member = await (await browser.newContext({ colorScheme })).newPage();
  await member.goto(MEMBER);
  await check(member, `${colorScheme} member sign-in`);
  await member.goto(`${MEMBER}/invitation#token=example`);
  await check(member, `${colorScheme} invitation`);
  await member.goto(MEMBER);
  await member.getByRole('button', { name: 'Robin (manager)' }).click();
  await member.getByRole('heading', { name: 'Book a machine', level: 1 }).waitFor();
  await check(member, `${colorScheme} book`);
  for (const tab of ['My bookings', 'Machines', 'Team', 'Messages', 'Outbox', 'Usage', 'Account']) {
    await member.getByRole('link', { name: tab, exact: true }).click();
    await member.getByRole('heading', { name: tab, level: 1 }).waitFor();
    await check(member, `${colorScheme} ${tab}`);
  }
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    const kiosk = await (await browser.newContext({ colorScheme, viewport })).newPage();
    await kiosk.goto(KIOSK);
    await check(kiosk, `${colorScheme} ${viewport.width}px kiosk sign-in`);
    await kiosk.getByRole('button', { name: 'Jules (staff)' }).click();
    await kiosk.getByText(/arrived/).first().waitFor();
    await check(kiosk, `${colorScheme} ${viewport.width}px front desk`);
  }
}
await browser.close();
console.log(found.length ? found.join('\n') : `0 violations across ${states} page states`);
process.exitCode = found.length ? 1 : 0;
```

## 3. Run it

```bash
cd "$AUDIT" && node audit.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` if Chromium is installed somewhere shared, or run `npx playwright install chromium` first. Stop the three servers afterwards and drop the database with `dropdb booking_kiosk_audit`.

## Last result

**2026-10-18, axe-core 4.14.0 (WCAG 2.0, 2.1 and 2.2 A and AA rules plus best practices): 0 violations across 28 page states.** In light and in dark: the member sign-in page, the invitation page, the booking page, My bookings, Machines, Team, Messages, Outbox, Usage and Account (signed in as the manager), and the kiosk's sign-in page and front desk at 1280px and at 375px.
