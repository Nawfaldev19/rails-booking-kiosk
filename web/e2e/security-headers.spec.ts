import { expect, test } from '@playwright/test';
import { CONTENT_SECURITY_POLICY } from '../security-headers';
import { KIOSK_APP, MEMBER_APP, signIn } from './helpers';

// The built apps are served with a strict Content Security Policy. These tests
// check the headers arrive and that a full sign-in, which loads every script,
// style sheet and font and calls the API, runs without a single violation.
for (const [name, app, account] of [
  ['member app', MEMBER_APP, /Sam \(member\)/],
  ['kiosk', KIOSK_APP, /Jules \(staff\)/],
] as const) {
  test(`the ${name} sends security headers and nothing breaks its policy`, async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });

    const response = await page.goto(app);
    const headers = response!.headers();
    expect(headers['content-security-policy']).toBe(CONTENT_SECURITY_POLICY);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');

    const apiResponse = page.waitForResponse((r) => r.url().endsWith('/graphql'));
    await signIn(page, app, account);
    const api = await apiResponse;
    expect(api.headers()['cache-control']).toBe('no-store');
    expect(api.headers()['x-content-type-options']).toBe('nosniff');

    expect(violations).toEqual([]);
  });
}
