import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MEMBER_APP, signIn } from './helpers';

// The e2e API runs in development mode, which writes each delivered message to
// api/tmp/mails/<recipient>. Reading it there is the closest a test gets to
// opening the invitation in a mail client.
const MAILS = fileURLToPath(new URL('../../api/tmp/mails/', import.meta.url));

async function invitationLink(email: string): Promise<string> {
  let link = '';
  await expect
    .poll(async () => {
      const mail = await readFile(`${MAILS}${email}`, 'utf8').catch(() => '');
      link = /http:\/\/\S+\/invitation#token=[\w-]+/.exec(mail)?.[0] ?? '';
      return link;
    })
    .not.toBe('');
  return link;
}

test('a manager invites someone, who chooses their own password, and can later be removed', async ({
  page,
  browser,
}) => {
  const email = `quinn-${String(Date.now())}@example.com`;
  await signIn(page, MEMBER_APP, /Robin \(manager\)/);
  await page.getByRole('link', { name: 'Team' }).click();
  await expect(page).toHaveTitle('Team · Larkspur Makerspace · Booking Kiosk');
  await page.getByLabel('Name').fill('Quinn Example');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Add to team' }).click();
  await expect(page.getByText(`Invitation sent to ${email}.`, { exact: false })).toBeVisible();
  const entry = page.getByRole('listitem').filter({ hasText: email });
  await expect(entry.getByText('Invitation sent', { exact: true })).toBeVisible();

  // The manager's outbox never shows the token.
  await page.getByRole('link', { name: 'Outbox' }).click();
  const message = page.getByRole('listitem').filter({ hasText: email });
  await message.getByText(/You're invited/).click();
  await expect(message.getByText(/#token=hidden/)).toBeVisible();

  // The invited person opens the link in their own browser.
  const link = await invitationLink(email);
  expect(link.startsWith('http://localhost:5273/invitation#token=')).toBe(true);
  const quinn = await (await browser.newContext()).newPage();
  await quinn.goto(link);
  await expect(quinn).toHaveURL(`${MEMBER_APP}/invitation`);
  await quinn.getByLabel('New password', { exact: true }).fill('quinn-chose-this-1');
  await quinn.getByLabel('New password again').fill('quinn-chose-this-1');
  await quinn.getByRole('button', { name: 'Set password and sign in' }).click();
  await expect(
    quinn.getByRole('heading', { name: 'Staff accounts use the front-desk kiosk' }),
  ).toBeVisible();

  // They change it from the Account page.
  await quinn.getByRole('link', { name: 'Account' }).click();
  await quinn.getByLabel('Current password').fill('quinn-chose-this-1');
  await quinn.getByLabel('New password', { exact: true }).fill('quinn-changed-it-2');
  await quinn.getByLabel('New password again').fill('quinn-changed-it-2');
  await quinn.getByRole('button', { name: 'Change password' }).click();
  await expect(quinn.getByText(/Password changed/)).toBeVisible();

  // The link worked once only.
  const again = await (await browser.newContext()).newPage();
  await again.goto(link);
  await again.getByLabel('New password', { exact: true }).fill('someone-else-123');
  await again.getByLabel('New password again').fill('someone-else-123');
  await again.getByRole('button', { name: 'Set password and sign in' }).click();
  await expect(again.getByText(/not valid any more/)).toBeVisible();

  // Removal takes effect at once.
  await page.getByRole('link', { name: 'Team' }).click();
  await page.getByRole('button', { name: 'Remove Quinn Example…' }).click();
  await page.getByRole('button', { name: 'Yes, remove Quinn Example' }).click();
  await expect(page.getByText('Quinn Example was removed from the workspace.')).toBeVisible();
  await quinn.goto(MEMBER_APP);
  await expect(quinn.getByRole('heading', { name: 'No workspaces yet' })).toBeVisible();
});
