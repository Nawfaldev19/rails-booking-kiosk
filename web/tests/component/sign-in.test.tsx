import { MockedProvider } from '@apollo/client/testing/react';
import { signInMutation, viewerQuery } from '@booking-kiosk/api';
import { DEMO_PASSWORD, SignInPanel } from '@booking-kiosk/ui';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

const accounts = [{ label: 'Sam (member)', email: 'sam@example.com' }];

describe('SignInPanel', () => {
  it('shows the server message for wrong credentials', async () => {
    const mocks = [
      {
        request: {
          query: signInMutation,
          variables: { email: 'sam@example.com', password: 'wrong-password' },
        },
        result: {
          data: {
            signIn: {
              __typename: 'SignInPayload',
              viewer: null,
              errors: [
                {
                  __typename: 'UserError',
                  code: 'INVALID_CREDENTIALS',
                  message: 'That email and password do not match.',
                },
              ],
            },
          },
        },
      },
    ] as const;
    const screen = await render(
      <MockedProvider mocks={mocks}>
        <SignInPanel heading="Sign in" intro="Hello" demoAccounts={accounts} />
      </MockedProvider>,
    );
    await screen.getByLabelText('Email').fill('sam@example.com');
    await screen.getByLabelText('Password').fill('wrong-password');
    await screen.getByRole('button', { name: 'Sign in' }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('That email and password do not match.');
  });

  it('signs in with a demo account in one click', async () => {
    const mocks = [
      {
        request: {
          query: signInMutation,
          variables: { email: 'sam@example.com', password: DEMO_PASSWORD },
        },
        result: {
          data: {
            signIn: {
              __typename: 'SignInPayload',
              viewer: { __typename: 'Viewer', user: { __typename: 'User', id: 'u1' } },
              errors: [],
            },
          },
        },
      },
      {
        request: { query: viewerQuery },
        result: { data: { viewer: null } },
      },
    ] as const;
    const screen = await render(
      <MockedProvider mocks={mocks}>
        <SignInPanel heading="Sign in" intro="Hello" demoAccounts={accounts} />
      </MockedProvider>,
    );
    await screen.getByRole('button', { name: 'Sam (member)' }).click();
    await expect.element(screen.getByLabelText('Email')).toHaveValue('sam@example.com');
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  });

  it('explains network failures in plain words', async () => {
    const mocks = [
      {
        request: {
          query: signInMutation,
          variables: { email: 'sam@example.com', password: 'whatever-123' },
        },
        error: new TypeError('Failed to fetch'),
      },
    ] as const;
    const screen = await render(
      <MockedProvider mocks={mocks}>
        <SignInPanel heading="Sign in" intro="Hello" demoAccounts={[]} />
      </MockedProvider>,
    );
    await screen.getByLabelText('Email').fill('sam@example.com');
    await screen.getByLabelText('Password').fill('whatever-123');
    await screen.getByRole('button', { name: 'Sign in' }).click();
    const message = screen.getByText(/Cannot reach the server/);
    await expect.element(message).toBeVisible();
    expect(message.element().closest('[role="alert"]')).not.toBeNull();
  });
});
