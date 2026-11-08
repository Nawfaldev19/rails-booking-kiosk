import { expect, test } from '@playwright/test';
import { KIOSK_APP, signIn } from './helpers';

test('staff find a member and mark them as arrived, then undo @mobile', async ({
  page,
  isMobile,
}) => {
  await signIn(page, KIOSK_APP, /Jules \(staff\)/);
  await expect(page.getByRole('heading', { name: 'Larkspur Makerspace' })).toBeVisible();
  await expect(page.getByText('2 / 7 arrived')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search by member or machine' }).fill('ines');
  // Ines has two bookings today; each button names its machine and time.
  await page
    .getByRole('button', { name: /^Mark Ines Valdés as arrived, Wood lathe, 11:00/ })
    .click();
  await expect(page.getByText('3 / 7 arrived')).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: /^Arrived \(/ }).click();
  await page.getByRole('button', { name: /^Undo arrival for Ines Valdés, Wood lathe/ }).click();
  await expect(page.getByText('2 / 7 arrived')).toBeVisible();
});

test('members cannot use the kiosk', async ({ page }) => {
  await page.goto(KIOSK_APP);
  await page.getByLabel('Email').fill('sam@example.com');
  await page.getByLabel('Password').fill('booking-kiosk-demo-pass');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No front-desk access' })).toBeVisible();
});
