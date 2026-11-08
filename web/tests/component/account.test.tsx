import { acceptInvitationMutation, changePasswordMutation, viewerQuery } from '@booking-kiosk/api';
import { afterEach, describe, expect, it } from 'vitest';
import { AcceptInvitationPage } from '../../apps/member/src/account/AcceptInvitationPage';
import { AccountPage } from '../../apps/member/src/account/AccountPage';
import { renderPage } from './render';

const viewer = {
  __typename: 'Viewer' as const,
  user: { __typename: 'User' as const, id: 'u1', name: 'Quinn Example' },
  memberships: [],
};

const payload = (name: 'acceptInvitation' | 'changePassword', errors: unknown[] = []) => ({
  data: {
    [name]: {
      __typename: name === 'acceptInvitation' ? 'AcceptInvitationPayload' : 'ChangePasswordPayload',
      viewer:
        errors.length === 0
          ? { __typename: 'Viewer', user: { __typename: 'User', id: 'u1' } }
          : null,
      errors,
    },
  },
});

describe('AcceptInvitationPage', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('takes the token from the link, removes it from the address bar and sets the password', async () => {
    window.history.replaceState(null, '', '/invitation#token=abc123');
    const screen = await renderPage(<AcceptInvitationPage />, {
      path: '/invitation',
      url: '/invitation',
      mocks: [
        {
          request: {
            query: acceptInvitationMutation,
            variables: { token: 'abc123', password: 'my-own-pass-1' },
          },
          result: payload('acceptInvitation'),
        },
        { request: { query: viewerQuery }, result: { data: { viewer } } },
      ],
    });
    await expect
      .element(screen.getByRole('heading', { name: 'Choose your password' }))
      .toBeVisible();
    expect(window.location.hash).toBe('');
    expect(document.title).toBe('Choose your password · Booking Kiosk');

    await screen.getByLabelText('New password', { exact: true }).fill('my-own-pass-1');
    await screen.getByLabelText('New password again').fill('my-own-pass-2');
    await screen.getByRole('button', { name: 'Set password and sign in' }).click();
    await expect
      .element(screen.getByLabelText('New password', { exact: true }))
      .toHaveAccessibleDescription('The two passwords are different.');

    await screen.getByLabelText('New password again').fill('my-own-pass-1');
    await screen.getByRole('button', { name: 'Set password and sign in' }).click();
    await expect
      .element(screen.getByRole('heading', { name: 'Choose your password' }))
      .not.toBeInTheDocument();
  });

  it('explains a used or expired link', async () => {
    window.history.replaceState(null, '', '/invitation#token=used');
    const screen = await renderPage(<AcceptInvitationPage />, {
      path: '/invitation',
      url: '/invitation',
      mocks: [
        {
          request: {
            query: acceptInvitationMutation,
            variables: { token: 'used', password: 'my-own-pass-1' },
          },
          result: payload('acceptInvitation', [
            {
              __typename: 'UserError',
              code: 'NOT_FOUND',
              field: null,
              message: 'This invitation link is not valid any more.',
            },
          ]),
        },
      ],
    });
    await screen.getByLabelText('New password', { exact: true }).fill('my-own-pass-1');
    await screen.getByLabelText('New password again').fill('my-own-pass-1');
    await screen.getByRole('button', { name: 'Set password and sign in' }).click();
    await expect.element(screen.getByText(/not valid any more/)).toBeVisible();
  });

  it('asks for the link when the page is opened without one', async () => {
    const screen = await renderPage(<AcceptInvitationPage />, {
      path: '/invitation',
      url: '/invitation',
      mocks: [],
    });
    await expect.element(screen.getByText(/needs the link from your invitation/)).toBeVisible();
  });
});

describe('AccountPage', () => {
  it('shows a wrong current password on its field, then changes the password', async () => {
    const wrong = { currentPassword: 'not-it-at-all', newPassword: 'brand-new-pass-1' };
    const right = { currentPassword: 'booking-kiosk-demo-pass', newPassword: 'brand-new-pass-1' };
    const screen = await renderPage(<AccountPage />, {
      outletContext: { viewer },
      mocks: [
        {
          request: { query: changePasswordMutation, variables: wrong },
          result: payload('changePassword', [
            {
              __typename: 'UserError',
              code: 'INVALID_CREDENTIALS',
              field: 'currentPassword',
              message: 'That is not your current password.',
            },
          ]),
        },
        {
          request: { query: changePasswordMutation, variables: right },
          result: payload('changePassword'),
        },
      ],
    });
    const current = screen.getByLabelText('Current password');
    await current.fill(wrong.currentPassword);
    await screen.getByLabelText('New password', { exact: true }).fill(wrong.newPassword);
    await screen.getByLabelText('New password again').fill(wrong.newPassword);
    await screen.getByRole('button', { name: 'Change password' }).click();
    await expect.element(current).toHaveAccessibleDescription('That is not your current password.');

    await current.fill(right.currentPassword);
    await screen.getByRole('button', { name: 'Change password' }).click();
    await expect.element(screen.getByText(/Password changed/)).toBeVisible();
    await expect.element(current).toHaveValue('');
  });
});
