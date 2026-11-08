import { expect, test } from '@playwright/test';
import { chooseTomorrow, MEMBER_APP, signIn } from './helpers';

test('a manager adds a machine that members can then book', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Machines' }).click();
  const form = page.getByRole('region', { name: 'Add a machine' });
  await form.getByLabel('Name').fill('Bandsaw');
  await form.getByLabel('Description').fill('14-inch bandsaw.');
  await form.getByLabel('Slot length').selectOption('30');
  await form.getByRole('button', { name: 'Add machine' }).click();
  await expect(page.getByText('Bandsaw added.')).toBeVisible();

  await page.getByRole('link', { name: 'Book', exact: true }).click();
  await chooseTomorrow(page);
  await expect(page.getByRole('button', { name: 'Bandsaw, 08:30, free' })).toBeEnabled();
});

test('retiring a machine asks first, then takes it off the booking grid', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Machines' }).click();
  const bandsaw = page.getByRole('listitem').filter({ hasText: 'Bandsaw' });
  await bandsaw.getByRole('button', { name: 'Retire…' }).click();
  await bandsaw.getByRole('button', { name: 'Yes, retire it' }).click();
  await expect(page.getByText('Bandsaw retired. Its history is kept.')).toBeVisible();
  await expect(bandsaw.getByText('Retired', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Book', exact: true }).click();
  await chooseTomorrow(page);
  await expect(page.getByRole('heading', { name: 'Wood lathe' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bandsaw' })).toHaveCount(0);
});

test('duplicate machine names come back as a field error', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Machines' }).click();
  const form = page.getByRole('region', { name: 'Add a machine' });
  await form.getByLabel('Name').fill('Wood lathe');
  await form.getByRole('button', { name: 'Add machine' }).click();
  await expect(form.getByText(/Name has already been taken/)).toBeVisible();
});

test('a template with an unknown variable cannot be saved; a valid one can', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Messages' }).click();
  const editor = page.getByRole('region', { name: /Booking cancelled/ });
  const subject = editor.getByLabel('Subject');
  await subject.fill('Cancelled: {{ member.secret }}');
  await expect(editor.getByText(/would fall back to the default/)).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Save template' })).toBeDisabled();

  await subject.fill('Sorry {{ member.name }}, your {{ machine.name }} slot is cancelled');
  await expect(
    editor.getByText('Sorry Robin Example, your Laser cutter slot is cancelled'),
  ).toBeVisible();
  await editor.getByRole('button', { name: 'Save template' }).click();
  await expect(
    page.getByRole('region', { name: /Booking cancelled \(customised\)/ }),
  ).toBeVisible();
});

test('the outbox shows the confirmation message for a new booking', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await chooseTomorrow(page);
  await page.getByRole('button', { name: 'Wood lathe, 13:00, free' }).click();
  await page
    .getByRole('complementary', { name: 'Your holds' })
    .getByRole('button', { name: 'Confirm' })
    .click();
  await expect(page.getByText(/Booked: Wood lathe/)).toBeVisible();

  await page.getByRole('link', { name: 'Outbox' }).click();
  const message = page.getByRole('listitem').filter({ hasText: 'robin@example.com' }).first();
  await expect(message).toContainText(/Wood lathe/);
  await expect(message.getByText(/Delivered|Pending/)).toBeVisible();
});

test('usage shows booked hours per machine', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Usage' }).click();
  const laser = page.locator('tbody tr', { hasText: 'Laser cutter' });
  await expect(laser).toBeVisible();
  await expect(laser.locator('td').first()).not.toHaveText('0.0');
});
