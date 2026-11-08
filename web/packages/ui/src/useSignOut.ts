import { useApolloClient, useMutation } from '@apollo/client/react';
import { describeFailure, signOutMutation } from '@booking-kiosk/api';
import { useState } from 'react';

/**
 * Signs out, clears the cached data of the previous person, then runs
 * `afterSignOut` (navigate home, refetch the viewer). A failure, such as a lost
 * connection, comes back as `problem` instead of an unhandled rejection.
 *
 * @param afterSignOut - Runs once the session has ended and the cache is cleared.
 * @returns `signOut` to call from a button, and `problem`, a message to show when it failed.
 */
export function useSignOut(afterSignOut: () => Promise<unknown>) {
  const client = useApolloClient();
  const [mutate] = useMutation(signOutMutation);
  const [problem, setProblem] = useState<string | null>(null);

  const signOut = async () => {
    setProblem(null);
    try {
      await mutate();
      await client.clearStore();
      await afterSignOut();
    } catch (failure) {
      setProblem(`Could not sign out. ${describeFailure(failure)}`);
    }
  };

  return { signOut, problem };
}
