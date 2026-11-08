// Where an invitation link lands: the invited person chooses their password and is signed in.
import { useMutation } from '@apollo/client/react';
import { acceptInvitationMutation, describeFailure, viewerQuery } from '@booking-kiosk/api';
import { AppHeader, Button, Notice, TextField, useDocumentTitle } from '@booking-kiosk/ui';
import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

/** Reads the one-time token from the link's fragment (`/invitation#token=…`). */
function tokenFromHash(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
}

/**
 * The invitation page: choose a password, then go to the workspace.
 *
 * @remarks
 * The token travels in the URL fragment, which the browser never sends to a
 * server. The page takes it once and removes it from the address bar, so it
 * does not linger in history.
 * @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
 */
export function AcceptInvitationPage() {
  useDocumentTitle('Choose your password');
  const navigate = useNavigate();
  const [token] = useState(tokenFromHash);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [accept, { loading }] = useMutation(acceptInvitationMutation, {
    refetchQueries: [viewerQuery],
    awaitRefetchQueries: true,
  });

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const submit = async () => {
    setProblem(null);
    setFieldError(null);
    if (password !== repeat) {
      setFieldError('The two passwords are different.');
      return;
    }
    try {
      const result = await accept({ variables: { token, password } });
      const failure = result.data?.acceptInvitation.errors[0];
      if (!failure) {
        await navigate('/');
      } else if (failure.field === 'password') {
        setFieldError(failure.message);
      } else {
        setProblem(failure.message);
      }
    } catch (failure) {
      setProblem(describeFailure(failure));
    }
  };

  return (
    <div className="k-shell">
      <AppHeader product="Book a machine" homeHref="/" />
      <main className="k-main k-survey" id="main">
        <div className="k-card k-stack account-card">
          <h1 className="k-page-title">Choose your password</h1>
          {token === '' ? (
            <Notice tone="error">
              This page needs the link from your invitation message. Open the link again, or ask a
              manager to send a new one. <Link to="/">Go to sign in</Link>
            </Notice>
          ) : (
            <form
              className="k-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <p className="k-muted">
                You have been added to a Booking Kiosk workspace. Choose a password of 10 to 72
                characters; no one else, including the manager who invited you, knows it.
              </p>
              <TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={72}
                value={password}
                error={fieldError}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
              <TextField
                label="New password again"
                type="password"
                autoComplete="new-password"
                required
                value={repeat}
                onChange={(e) => {
                  setRepeat(e.target.value);
                }}
              />
              {problem && <Notice tone="error">{problem}</Notice>}
              <Button
                type="submit"
                variant="primary"
                busy={loading}
                icon={<KeyRound size={18} aria-hidden="true" />}
              >
                Set password and sign in
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
