import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  chooseTomorrow,
  horizontalOverflow,
  KIOSK_APP,
  MEMBER_APP,
  storedSession,
  type StoredSession,
} from './helpers';

// Layout at phone and tablet widths: no page may scroll sideways (WCAG 1.4.10
// Reflow), and keyboard focus must never end up underneath the sticky hold tray
// (WCAG 2.4.11 Focus Not Obscured). Each account signs in once; the session is
// reused for every viewport.
const SIZES = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
] as const;

const MANAGER_PAGES = [
  ['/w/larkspur', 'Book a machine'],
  ['/w/larkspur/bookings', 'My bookings'],
  ['/w/larkspur/manage/machines', 'Machines'],
  ['/w/larkspur/manage/team', 'Team'],
  ['/w/larkspur/manage/messages', 'Messages'],
  ['/w/larkspur/manage/outbox', 'Outbox'],
  ['/w/larkspur/manage/usage', 'Usage'],
  ['/account', 'Account'],
] as const;

let robin: StoredSession;
let jules: StoredSession;

test.beforeAll(async ({ browser }) => {
  robin = await storedSession(browser, MEMBER_APP, /Robin \(manager\)/);
  jules = await storedSession(browser, KIOSK_APP, /Jules \(staff\)/);
});

async function pageAt(
  browser: Browser,
  size: (typeof SIZES)[number],
  storageState?: StoredSession,
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: true,
    storageState,
  });
  return context.newPage();
}

async function expectNoSidewaysScroll(page: Page, url: string, heading: string) {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  expect(await horizontalOverflow(page), `${url} scrolls sideways`).toBe(0);
}

for (const size of SIZES) {
  test(`no page scrolls sideways at ${size.name} width (${size.width}px)`, async ({ browser }) => {
    const visitor = await pageAt(browser, size);
    await expectNoSidewaysScroll(visitor, MEMBER_APP, 'Sign in');
    await expectNoSidewaysScroll(visitor, KIOSK_APP, 'Front desk');
    await expectNoSidewaysScroll(
      visitor,
      `${MEMBER_APP}/invitation#token=x`,
      'Choose your password',
    );

    const manager = await pageAt(browser, size, robin);
    for (const [path, heading] of MANAGER_PAGES) {
      await expectNoSidewaysScroll(manager, `${MEMBER_APP}${path}`, heading);
    }

    const desk = await pageAt(browser, size, jules);
    await expectNoSidewaysScroll(desk, `${KIOSK_APP}/w/larkspur`, 'Larkspur Makerspace');
  });
}

test('moving focus back up the slot grid on a phone never hides it under the hold tray', async ({
  browser,
}) => {
  const page = await pageAt(browser, SIZES[0], robin);
  await page.goto(`${MEMBER_APP}/w/larkspur`);
  await chooseTomorrow(page);
  await page.getByRole('button', { name: 'Laser cutter, 19:00, free' }).click();
  // The new hold's Confirm button takes focus once the hold exists; wait for that
  // before moving focus, or it would jump to the tray in the middle of the walk.
  const tray = page.getByRole('complementary', { name: 'Your holds' });
  await expect(tray.getByRole('button', { name: 'Confirm Laser cutter, 19:00' })).toBeFocused();

  // Start at the last slot and Shift+Tab upwards: the browser scrolls each slot
  // to the top of the viewport, which is exactly where the tray sticks.
  await page.getByRole('button', { name: /^Wood lathe, 21:00/ }).focus();
  let checked = 0;
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press('Shift+Tab');
    const covered = await page.evaluate(() => {
      const focused = document.activeElement;
      const trayBox = document.querySelector('.hold-tray')?.getBoundingClientRect();
      if (!focused?.classList.contains('slot') || !trayBox) return null;
      const box = focused.getBoundingClientRect();
      return box.top < trayBox.bottom && box.bottom > trayBox.top;
    });
    if (covered === null) continue;
    checked += 1;
    expect(covered, 'a focused slot is underneath the hold tray').toBe(false);
  }
  expect(checked).toBeGreaterThan(20);

  await tray.getByRole('button', { name: 'Release Laser cutter, 19:00' }).click();
  await expect(tray.getByText('Hold released.')).toBeVisible();
});
