---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Invite team members to choose their own password

## Context and Problem Statement

Managers add staff and managers by email, and accounts are global: one person can belong to several workspaces. If a manager chose a new account's password, that manager could sign in as the person later, including after they joined another workspace, and read that workspace's data. Adding an account that already exists raises the opposite problem: nobody should gain a role without agreeing to it, and the mutation must not reveal names or become a password oracle. How should people join a team?

## Decision Drivers

* No password is ever chosen, seen or stored by anyone but its owner.
* Joining needs the person's consent; no account detail crosses workspaces without it.
* Links that grant access are single-use, expire, and are useless if the database is copied.
* Works with the existing outbox, without new infrastructure.

## Considered Options

* (a) New email: an account without a password plus a one-time invitation link; existing account: its owner types their own password at the manager's screen
* (b) Manager sets a temporary password that must be changed at first sign-in
* (c) Invitations for existing accounts too, accepted by signing in

## Decision Outcome

Chosen option: "(a)", because it removes manager-known passwords entirely and keeps the existing-account flow working without new screens for the invitee.

* A new email gets an account with no password (it cannot sign in) and a membership. `Invitation.issue!` stores the SHA-256 digest of a 256-bit random token that expires after 72 hours; the raw token appears only in an `invitation` message recorded in the outbox, as `/invitation#token=…` in the member app. The fragment is never sent to a server or in a `Referer`.
* `acceptInvitation(token, password)` locks the invitation, sets the password, deletes the account's invitations and signs the person in. An unknown, used or expired token is `NOT_FOUND`; attempts are limited per client address.
* Managers can read the outbox, so the token is shown there as `hidden`, and the stored body loses the token once the message is delivered.
* Adding someone whose invitation is still open sends a fresh link and invalidates the old one. A workspace can send 20 invitations an hour.
* An existing account joins only when the password typed is that account's own; a wrong or missing password returns `INVALID_CREDENTIALS` on `password`, reveals nothing else, and uses the sign-in rate limit.
* `changePassword(currentPassword, newPassword)` lets anyone change their password; it ends every other session.

### Consequences

* Good, because a manager never knows another person's password, so the cross-workspace takeover is gone.
* Good, because a stolen copy of the database holds digests, not usable links.
* Bad, because until a message is delivered its token is stored in the outbox body (masked whenever it is shown).
* Bad, because a manager can still tell that an email has an account, as any sign-up form can.
* Bad, because the owner of an existing account must be present at the manager's screen; (c) would remove that and is the next step.

### Confirmation

* [`team_spec.rb`](../../api/spec/requests/team_spec.rb): invitations without a password, the masked and scrubbed token, single use, expiry, re-sending, the rate limits, existing accounts, role changes, removal and password changes.
* [`team.spec.ts`](../../web/e2e/team.spec.ts): a manager invites someone, who opens the delivered link, chooses a password, changes it, and is then removed.

## Pros and Cons of the Options

### (a) Invitations for new accounts, own password for existing ones

* Good, because no shared secret ever exists.
* Bad, because existing accounts still use the in-person flow.

### (b) Temporary password

* Good, because it needs no email.
* Bad, because the manager knows a working password until the first sign-in, which may never happen.

### (c) Invitations for everyone

* Good, because it is one flow.
* Bad, because accepting needs a signed-in "pending invitations" screen this release does not have.

## More Information

Threat model entry: [security/threat-model.md](../security/threat-model.md#boundary-3--4-api-to-database).
