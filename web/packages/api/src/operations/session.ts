// Typed GraphQL documents for signing in and out and reading the viewer.
import { graphql } from '../generated';

/** The signed-in person and their workspaces; `viewer` is null when signed out. */
export const viewerQuery = graphql(`
  query Viewer {
    viewer {
      user {
        id
        name
      }
      memberships {
        id
        role
        workspace {
          name
          slug
        }
      }
    }
  }
`);

/**
 * Starts a session. A wrong password or a rate limit comes back as a typed
 * error (`INVALID_CREDENTIALS`, `RATE_LIMITED`), never as a thrown error.
 */
export const signInMutation = graphql(`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      viewer {
        user {
          id
        }
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Ends the session; callers then clear the Apollo cache (see `useSignOut`). */
export const signOutMutation = graphql(`
  mutation SignOut {
    signOut {
      signedOut
    }
  }
`);

/**
 * Chooses the password of an invited account with the token from its link,
 * and signs in. A used, expired or unknown link returns `NOT_FOUND`.
 *
 * @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
 */
export const acceptInvitationMutation = graphql(`
  mutation AcceptInvitation($token: String!, $password: String!) {
    acceptInvitation(token: $token, password: $password) {
      viewer {
        user {
          id
        }
      }
      errors {
        code
        message
        field
      }
    }
  }
`);

/** Changes the signed-in person's password; every other session of the account ends. */
export const changePasswordMutation = graphql(`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      viewer {
        user {
          id
        }
      }
      errors {
        code
        message
        field
      }
    }
  }
`);
