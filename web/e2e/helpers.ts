import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';

export const MEMBER_APP = 'http://localhost:5273';
export const KIOSK_APP = 'http://localhost:5274';

/** Signs in through the landing page's one-click demo account buttons. */
export async function signIn(page: Page, app: string, account: RegExp) {
  await page.goto(app);
  await page.getByRole('button', { name: account }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** Selects the second day chip (tomorrow), where every slot is in the future. */
export async function chooseTomorrow(page: Page) {
  const strip = page.getByRole('group', { name: 'Choose a day' });
  await strip.getByRole('button').nth(1).click();
}

/** A signed-in session to reuse across contexts with other viewport sizes. */
export type StoredSession = Exclude<BrowserContextOptions['storageState'], string | undefined>;

/** Signs in once and returns the session, so a test can open several viewports quickly. */
export async function storedSession(
  browser: Browser,
  app: string,
  account: RegExp,
): Promise<StoredSession> {
  const context = await browser.newContext();
  await signIn(await context.newPage(), app, account);
  const state = await context.storageState();
  await context.close();
  return state;
}

/** How many CSS pixels the page is wider than its viewport (0 when nothing scrolls sideways). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return Math.max(0, root.scrollWidth - root.clientWidth);
  });
}
