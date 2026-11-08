// Email and password sign-in, shared by both apps.
import { useMutation } from '@apollo/client/react';
import { describeFailure, firstUserError, signInMutation, viewerQuery } from '@booking-kiosk/api';
import { LogIn } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Notice } from './Notice';
import { TextField } from './TextField';

/** A seeded, fictional account offered as a one-click sign-in button. */
export interface DemoAccount {
  /** The button text, such as "Sam (member)". */
  readonly label: string;
  /** The account's email, always at example.com. */
  readonly email: string;
}

/**
 * The password of every seeded demo account (see `api/db/seeds.rb`).
 *
 * @remarks
 * It is public on purpose: the accounts are fictional and exist only in the
 * demo seed data. It is not a secret and grants nothing outside a local copy.
 */
export const DEMO_PASSWORD = 'booking-kiosk-demo-pass';

/** Props for {@link SignInPanel}. */
interface SignInPanelProps {
  /** The page heading (`h1`). */
  readonly heading: string;
  /** A sentence or two under the heading. */
  readonly intro: ReactNode;
  /** One-click accounts to offer; an empty list hides the group. */
  readonly demoAccounts: readonly DemoAccount[];
}

/**
 * Email and password sign-in, with one-click demo accounts for visitors.
 *
 * @remarks
 * A wrong password shows the API's `INVALID_CREDENTIALS` message and a
 * network failure a plain-words one; on success the viewer query is refetched
 * so the app re-renders signed in.
 */
export function SignInPanel({ heading, intro, demoAccounts }: SignInPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [signIn, { loading }] = useMutation(signInMutation, {
    refetchQueries: [viewerQuery],
    awaitRefetchQueries: true,
  });

  const submit = async (credentials: { email: string; password: string }) => {
    setProblem(null);
    try {
      const result = await signIn({ variables: credentials });
      const error = firstUserError(result.data?.signIn.errors);
      if (error) setProblem(error.message);
    } catch (failure) {
      setProblem(describeFailure(failure));
    }
  };

  return (
    <div className="k-card k-stack" style={{ maxWidth: 440 }}>
      <h1 className="k-page-title">{heading}</h1>
      <div className="k-muted">{intro}</div>
      <form
        className="k-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ email, password });
        }}
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        {problem && <Notice tone="error">{problem}</Notice>}
        <Button
          type="submit"
          variant="primary"
          className="k-button-block"
          busy={loading}
          icon={<LogIn size={18} aria-hidden="true" />}
        >
          Sign in
        </Button>
      </form>
      {demoAccounts.length > 0 && (
        <div className="k-stack" role="group" aria-labelledby="demo-accounts">
          <h2 id="demo-accounts" style={{ fontSize: 'var(--text-base)' }}>
            Demo accounts
          </h2>
          <p className="k-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Fictional people. Password for all: <code>{DEMO_PASSWORD}</code>
          </p>
          <div className="k-cluster">
            {demoAccounts.map((account) => (
              <Button
                key={account.email}
                disabled={loading}
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                  void submit({ email: account.email, password: DEMO_PASSWORD });
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
