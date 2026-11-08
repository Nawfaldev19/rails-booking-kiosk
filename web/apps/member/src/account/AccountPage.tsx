// The signed-in person's account: who they are and a form to change their password.
import { useMutation } from '@apollo/client/react';
import { changePasswordMutation, describeFailure } from '@booking-kiosk/api';
import { Button, Notice, TextField, useDocumentTitle } from '@booking-kiosk/ui';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useViewer } from '../routes/viewer';

const EMPTY = { currentPassword: '', newPassword: '', repeat: '' };

/**
 * The Account page: change your password.
 *
 * @remarks
 * The current password is checked under the sign-in rate limit. A change ends
 * every other session of the account; this one carries on.
 */
export function AccountPage() {
  useDocumentTitle('Account');
  const viewer = useViewer();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [change, { loading }] = useMutation(changePasswordMutation);

  const submit = async () => {
    setMessage(null);
    setErrors({});
    if (draft.newPassword !== draft.repeat) {
      setErrors({ repeat: 'The two new passwords are different.' });
      return;
    }
    try {
      const result = await change({
        variables: { currentPassword: draft.currentPassword, newPassword: draft.newPassword },
      });
      const failure = result.data?.changePassword.errors[0];
      if (!failure) {
        setDraft(EMPTY);
        setMessage({
          tone: 'success',
          text: 'Password changed. Other devices have been signed out.',
        });
      } else if (failure.field) {
        setErrors({ [failure.field]: failure.message });
      } else {
        setMessage({ tone: 'error', text: failure.message });
      }
    } catch (failure) {
      setMessage({ tone: 'error', text: describeFailure(failure) });
    }
  };

  return (
    <main className="k-main" id="main">
      <div className="k-card k-stack account-card">
        <h1 className="k-page-title">Account</h1>
        <p className="k-muted">Signed in as {viewer.user.name}.</p>
        <form
          className="k-stack"
          aria-labelledby="change-password"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h2 id="change-password">Change password</h2>
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={draft.currentPassword}
            error={errors.currentPassword ?? null}
            onChange={(e) => {
              setDraft({ ...draft, currentPassword: e.target.value });
            }}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={72}
            hint="10 to 72 characters."
            value={draft.newPassword}
            error={errors.newPassword ?? null}
            onChange={(e) => {
              setDraft({ ...draft, newPassword: e.target.value });
            }}
          />
          <TextField
            label="New password again"
            type="password"
            autoComplete="new-password"
            required
            value={draft.repeat}
            error={errors.repeat ?? null}
            onChange={(e) => {
              setDraft({ ...draft, repeat: e.target.value });
            }}
          />
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          <Button
            type="submit"
            variant="primary"
            busy={loading}
            icon={<KeyRound size={18} aria-hidden="true" />}
          >
            Change password
          </Button>
        </form>
      </div>
    </main>
  );
}
