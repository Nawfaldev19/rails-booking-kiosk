import { expect, test, type Page } from '@playwright/test';
import { chooseTomorrow, MEMBER_APP, signIn } from './helpers';

test('a member holds, confirms, then cancels a booking', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await expect(page).toHaveURL(/\/w\/larkspur$/);
  await chooseTomorrow(page);

  await page.getByRole('button', { name: 'Laser cutter, 12:00, free' }).click();
  const tray = page.getByRole('complementary', { name: 'Your holds' });
  await expect(tray.getByText(/Held for [45]:\d\d/)).toBeVisible();
  await tray.getByRole('button', { name: 'Confirm' }).click();
  await expect(tray.getByText(/Booked: Laser cutter/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Laser cutter, 12:00, booked by you' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'My bookings' }).click();
  const item = page
    .getByRole('listitem')
    .filter({ hasText: 'Laser cutter' })
    .filter({ hasText: '12:00' });
  await expect(item.getByText('Confirmed')).toBeVisible();
  await item.getByRole('button', { name: /^Cancel Laser cutter, .*12:00–13:00…$/ }).click();
  await item.getByRole('button', { name: /^Yes, cancel it: Laser cutter/ }).click();
  await expect(page.getByText('Booking cancelled.')).toBeVisible();
  await expect(item.getByText('Cancelled')).toBeVisible();
});

test('releasing a hold frees the slot again', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await chooseTomorrow(page);
  await page.getByRole('button', { name: '3D printer B, 14:30, free' }).click();
  const tray = page.getByRole('complementary', { name: 'Your holds' });
  await tray.getByRole('button', { name: 'Release' }).click();
  await expect(tray.getByText('Hold released.')).toBeVisible();
  await expect(page.getByRole('button', { name: '3D printer B, 14:30, free' })).toBeEnabled();
});

test('when two members click the same free slot at once, exactly one gets it', async ({
  browser,
}) => {
  const sam = await (await browser.newContext()).newPage();
  const robin = await (await browser.newContext()).newPage();
  await signIn(sam, MEMBER_APP, /Sam \(member\)/);
  await signIn(robin, MEMBER_APP, /Robin \(manager\)/);
  await chooseTomorrow(sam);
  await chooseTomorrow(robin);
  const slot = { name: '3D printer A, 09:00, free' };
  // Both see the slot as free, then both click it in the same instant.
  await expect(sam.getByRole('button', slot)).toBeEnabled();
  await expect(robin.getByRole('button', slot)).toBeEnabled();
  await Promise.all([
    sam.getByRole('button', slot).click(),
    robin.getByRole('button', slot).click(),
  ]);

  const outcome = async (page: Page) => {
    const won = page.getByRole('complementary', { name: 'Your holds' }).getByText('3D printer A');
    const lost = page.getByText(/Someone else got that slot first/);
    await expect(won.or(lost)).toBeVisible();
    return (await lost.count()) > 0 ? 'lost' : 'won';
  };
  const outcomes = await Promise.all([outcome(sam), outcome(robin)]);
  expect([...outcomes].sort()).toEqual(['lost', 'won']);

  const loser = outcomes[0] === 'lost' ? sam : robin;
  await expect(loser.getByRole('button', { name: '3D printer A, 09:00, taken' })).toBeDisabled();
});

test('a member of one workspace cannot open another workspace', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await page.goto(`${MEMBER_APP}/w/no-such-space`);
  await expect(
    page.getByRole('heading', { name: 'You are not a member of this workspace' }),
  ).toBeVisible();
  await page.goto(`${MEMBER_APP}/w/larkspur/manage/machines`);
  await expect(page.getByRole('heading', { name: 'Managers only' })).toBeVisible();
});

test('workspace switcher moves between workspaces without mixing their data', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await expect(page.getByRole('button', { name: /Laser cutter, \d\d:\d\d/ }).first()).toBeVisible();
  await expect(page).toHaveTitle('Book a machine · Larkspur Makerspace · Booking Kiosk');
  // Choosing an option changes nothing until Go is pressed (WCAG 3.2.2 On Input).
  await page.getByRole('combobox', { name: 'Workspace' }).selectOption('wharf-street');
  await expect(page).toHaveURL(/\/w\/larkspur$/);
  await page.getByRole('button', { name: 'Go' }).click();
  await expect(page).toHaveURL(/\/w\/wharf-street$/);
  await expect(page).toHaveTitle('Book a machine · Wharf Street Workshop · Booking Kiosk');
  await expect(page.getByRole('heading', { name: 'CNC router' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Laser cutter' })).toHaveCount(0);
});

test('every page has its own title, and a route change is announced', async ({ page }) => {
  await signIn(page, MEMBER_APP, /Sam \(member\)/);
  await page.getByRole('link', { name: 'My bookings' }).click();
  await expect(page).toHaveTitle('My bookings · Larkspur Makerspace · Booking Kiosk');
  await expect(page.getByRole('status').filter({ hasText: /^My bookings/ })).toHaveText(
    'My bookings · Larkspur Makerspace',
  );
  await page.getByRole('link', { name: 'Account' }).click();
  await expect(page).toHaveTitle('Account · Booking Kiosk');
});
