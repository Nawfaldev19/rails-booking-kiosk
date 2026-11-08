import { expect, test } from '@playwright/test';
import { chooseTomorrow, KIOSK_APP, MEMBER_APP, signIn } from './helpers';

// Smoke tests for the tablet project (768 × 1024, touch): the layouts in between
// the phone and desktop breakpoints.

test('the kiosk shows expected and arrived side by side on a tablet @tablet', async ({ page }) => {
  await signIn(page, KIOSK_APP, /Jules \(staff\)/);
  await expect(page.getByRole('region', { name: /^Expected/ })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Arrived/ })).toBeVisible();
  // The phone-only switch between the two lists is not needed here.
  await expect(page.getByRole('group', { name: 'Show list' })).toBeHidden();
});

test('a member holds a slot and sees the hold tray on a tablet @tablet', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await chooseTomorrow(page);
  await page.getByRole('button', { name: 'Wood lathe, 20:00, free' }).click();
  const tray = page.getByRole('complementary', { name: 'Your holds' });
  const confirm = tray.getByRole('button', { name: 'Confirm Wood lathe, 20:00' });
  await expect(confirm).toBeFocused();
  await expect(confirm).toBeInViewport();
  await tray.getByRole('button', { name: 'Release Wood lathe, 20:00' }).click();
  await expect(tray.getByText('Hold released.')).toBeVisible();
});
