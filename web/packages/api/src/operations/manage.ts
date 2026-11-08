// Typed GraphQL documents for the manager pages: machines, team, messages, outbox and usage.
import { graphql } from '../generated';

/** Every machine, including retired ones, for the manager's Machines page. */
export const machinesQuery = graphql(`
  query Machines($slug: String!) {
    workspace(slug: $slug) {
      id
      machines(includeRetired: true) {
        id
        name
        description
        slotMinutes
        retired
      }
    }
  }
`);

/** Adds a machine; a duplicate name comes back as a field error on `name`. */
export const createMachineMutation = graphql(`
  mutation CreateMachine($name: String!, $description: String, $slotMinutes: Int!) {
    createMachine(name: $name, description: $description, slotMinutes: $slotMinutes) {
      machine {
        id
        name
        description
        slotMinutes
        retired
      }
      errors {
        code
        message
        field
      }
    }
  }
`);

/** Renames a machine or changes its description or slot length. */
export const updateMachineMutation = graphql(`
  mutation UpdateMachine($machineId: ID!, $name: String, $description: String, $slotMinutes: Int) {
    updateMachine(
      machineId: $machineId
      name: $name
      description: $description
      slotMinutes: $slotMinutes
    ) {
      machine {
        id
        name
        description
        slotMinutes
        retired
      }
      errors {
        code
        message
        field
      }
    }
  }
`);

/** Takes a machine out of service; refused while it has upcoming bookings. */
export const retireMachineMutation = graphql(`
  mutation RetireMachine($machineId: ID!) {
    retireMachine(machineId: $machineId) {
      machine {
        id
        retired
      }
      errors {
        code
        message
      }
    }
  }
`);

/** The fields the Team page shows for each person. */
export const staffMemberFields = graphql(`
  fragment StaffMemberFields on StaffMember {
    id
    name
    email
    role
    invitationPending
    isViewer
  }
`);

/** The workspace's staff and managers, with their emails and invitation state. */
export const teamQuery = graphql(`
  query Team($slug: String!) {
    workspace(slug: $slug) {
      id
      team {
        ...StaffMemberFields
      }
    }
  }
`);

/**
 * Gives someone a staff or manager role. A new email is sent an invitation to
 * choose a password; an existing account joins only with its own password.
 *
 * @see docs/adr/0008-invite-team-members-to-choose-their-own-password.md
 */
export const addTeamMemberMutation = graphql(`
  mutation AddTeamMember($name: String!, $email: String!, $password: String, $role: Role!) {
    addTeamMember(name: $name, email: $email, password: $password, role: $role) {
      teamMember {
        ...StaffMemberFields
      }
      errors {
        code
        message
        field
      }
    }
  }
`);

/** Gives someone else a new role; `MEMBER` takes staff and manager access away. */
export const changeTeamRoleMutation = graphql(`
  mutation ChangeTeamRole($membershipId: ID!, $role: Role!) {
    changeTeamRole(membershipId: $membershipId, role: $role) {
      teamMember {
        ...StaffMemberFields
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Takes someone else out of the workspace; refused for anyone with bookings. */
export const removeTeamMemberMutation = graphql(`
  mutation RemoveTeamMember($membershipId: ID!) {
    removeTeamMember(membershipId: $membershipId) {
      removedId
      errors {
        code
        message
      }
    }
  }
`);

/** The workspace's message templates, or the built-in defaults where none is saved. */
export const messageTemplatesQuery = graphql(`
  query MessageTemplates($slug: String!) {
    workspace(slug: $slug) {
      id
      messageTemplates {
        kind
        subject
        body
        customised
      }
    }
  }
`);

/** Renders a draft template against sample values and lists any problems. */
export const messagePreviewQuery = graphql(`
  query MessagePreview($slug: String!, $kind: MessageKind!, $subject: String!, $body: String!) {
    workspace(slug: $slug) {
      id
      messagePreview(kind: $kind, subject: $subject, body: $body) {
        subject
        body
        problems
      }
    }
  }
`);

/** Saves a customised template; unknown variables or bad syntax are refused. */
export const saveMessageTemplateMutation = graphql(`
  mutation SaveMessageTemplate($kind: MessageKind!, $subject: String!, $body: String!) {
    saveMessageTemplate(kind: $kind, subject: $subject, body: $body) {
      template {
        kind
        subject
        body
        customised
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Deletes the customised template so the built-in default is used again. */
export const resetMessageTemplateMutation = graphql(`
  mutation ResetMessageTemplate($kind: MessageKind!) {
    resetMessageTemplate(kind: $kind) {
      template {
        kind
        subject
        body
        customised
      }
      errors {
        code
        message
      }
    }
  }
`);

/** One page of the outbox, newest first, with each message's status and last error. */
export const outboxQuery = graphql(`
  query Outbox($slug: String!, $after: String) {
    workspace(slug: $slug) {
      id
      outbox(first: 15, after: $after) {
        nodes {
          id
          kind
          recipient
          subject
          body
          status
          attempts
          lastError
          usedFallbackTemplate
          createdAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

/** Queues a failed message for another round of delivery attempts. */
export const retryMessageMutation = graphql(`
  mutation RetryMessage($messageId: ID!) {
    retryMessage(messageId: $messageId) {
      message {
        id
        status
        attempts
        lastError
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Confirmed hours and booking counts per machine over the last 14 days. */
export const utilisationQuery = graphql(`
  query Utilisation($slug: String!) {
    workspace(slug: $slug) {
      id
      utilisation {
        machine {
          id
          name
        }
        bookedHours
        bookingCount
      }
    }
  }
`);
