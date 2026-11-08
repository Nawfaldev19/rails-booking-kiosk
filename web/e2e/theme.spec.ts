import { expect, test } from '@playwright/test';
import { KIOSK_APP, MEMBER_APP } from './helpers';

// A saved theme must apply before the first paint. With the app's JavaScript
// bundle blocked, only theme-init.js can have set it, so the page could not
// have flashed the system theme first.
for (const [name, app] of [
  ['member app', MEMBER_APP],
  ['kiosk', KIOSK_APP],
] as const) {
  test(`the ${name} applies a saved theme before its scripts run`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('booking-kiosk.theme', 'dark');
    });
    await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(app);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).not.toBe('rgb(255, 255, 255)');
  });
}
