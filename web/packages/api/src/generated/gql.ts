/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query WorkspaceOverview($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      name\n      slug\n      timeZone\n      today\n      opensAt\n      closesAt\n      holdMinutes\n      maxActiveHolds\n      bookingHorizonDays\n      viewerRole\n    }\n  }\n": typeof types.WorkspaceOverviewDocument,
    "\n  query Availability($slug: String!, $date: ISO8601Date!) {\n    workspace(slug: $slug) {\n      id\n      availability(date: $date) {\n        machine {\n          id\n          name\n          description\n          slotMinutes\n        }\n        slots {\n          startsAt\n          endsAt\n          state\n          bookingId\n        }\n      }\n    }\n  }\n": typeof types.AvailabilityDocument,
    "\n  fragment BookingFields on Booking {\n    id\n    status\n    startsAt\n    endsAt\n    holdExpiresAt\n    machine {\n      id\n      name\n    }\n  }\n": typeof types.BookingFieldsFragmentDoc,
    "\n  query MyBookings($slug: String!, $upcoming: Boolean!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      myBookings(upcoming: $upcoming, first: 10, after: $after) {\n        nodes {\n          ...BookingFields\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.MyBookingsDocument,
    "\n  query MyHolds($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      myHolds {\n        ...BookingFields\n      }\n    }\n  }\n": typeof types.MyHoldsDocument,
    "\n  mutation PlaceHold($machineId: ID!, $startsAt: ISO8601DateTime!) {\n    placeHold(machineId: $machineId, startsAt: $startsAt) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.PlaceHoldDocument,
    "\n  mutation ConfirmBooking($bookingId: ID!) {\n    confirmBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.ConfirmBookingDocument,
    "\n  mutation ReleaseHold($bookingId: ID!) {\n    releaseHold(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.ReleaseHoldDocument,
    "\n  mutation CancelBooking($bookingId: ID!) {\n    cancelBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.CancelBookingDocument,
    "\n  query DaySheet($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      name\n      today\n      timeZone\n      daySheet {\n        id\n        startsAt\n        endsAt\n        arrivedAt\n        machine {\n          id\n          name\n        }\n        member {\n          name\n        }\n      }\n    }\n  }\n": typeof types.DaySheetDocument,
    "\n  mutation MarkArrival($bookingId: ID!, $arrived: Boolean!) {\n    markArrival(bookingId: $bookingId, arrived: $arrived) {\n      booking {\n        id\n        arrivedAt\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.MarkArrivalDocument,
    "\n  query Machines($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      machines(includeRetired: true) {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n    }\n  }\n": typeof types.MachinesDocument,
    "\n  mutation CreateMachine($name: String!, $description: String, $slotMinutes: Int!) {\n    createMachine(name: $name, description: $description, slotMinutes: $slotMinutes) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.CreateMachineDocument,
    "\n  mutation UpdateMachine($machineId: ID!, $name: String, $description: String, $slotMinutes: Int) {\n    updateMachine(\n      machineId: $machineId\n      name: $name\n      description: $description\n      slotMinutes: $slotMinutes\n    ) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.UpdateMachineDocument,
    "\n  mutation RetireMachine($machineId: ID!) {\n    retireMachine(machineId: $machineId) {\n      machine {\n        id\n        retired\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.RetireMachineDocument,
    "\n  fragment StaffMemberFields on StaffMember {\n    id\n    name\n    email\n    role\n    invitationPending\n    isViewer\n  }\n": typeof types.StaffMemberFieldsFragmentDoc,
    "\n  query Team($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      team {\n        ...StaffMemberFields\n      }\n    }\n  }\n": typeof types.TeamDocument,
    "\n  mutation AddTeamMember($name: String!, $email: String!, $password: String, $role: Role!) {\n    addTeamMember(name: $name, email: $email, password: $password, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.AddTeamMemberDocument,
    "\n  mutation ChangeTeamRole($membershipId: ID!, $role: Role!) {\n    changeTeamRole(membershipId: $membershipId, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.ChangeTeamRoleDocument,
    "\n  mutation RemoveTeamMember($membershipId: ID!) {\n    removeTeamMember(membershipId: $membershipId) {\n      removedId\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.RemoveTeamMemberDocument,
    "\n  query MessageTemplates($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      messageTemplates {\n        kind\n        subject\n        body\n        customised\n      }\n    }\n  }\n": typeof types.MessageTemplatesDocument,
    "\n  query MessagePreview($slug: String!, $kind: MessageKind!, $subject: String!, $body: String!) {\n    workspace(slug: $slug) {\n      id\n      messagePreview(kind: $kind, subject: $subject, body: $body) {\n        subject\n        body\n        problems\n      }\n    }\n  }\n": typeof types.MessagePreviewDocument,
    "\n  mutation SaveMessageTemplate($kind: MessageKind!, $subject: String!, $body: String!) {\n    saveMessageTemplate(kind: $kind, subject: $subject, body: $body) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.SaveMessageTemplateDocument,
    "\n  mutation ResetMessageTemplate($kind: MessageKind!) {\n    resetMessageTemplate(kind: $kind) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.ResetMessageTemplateDocument,
    "\n  query Outbox($slug: String!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      outbox(first: 15, after: $after) {\n        nodes {\n          id\n          kind\n          recipient\n          subject\n          body\n          status\n          attempts\n          lastError\n          usedFallbackTemplate\n          createdAt\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.OutboxDocument,
    "\n  mutation RetryMessage($messageId: ID!) {\n    retryMessage(messageId: $messageId) {\n      message {\n        id\n        status\n        attempts\n        lastError\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.RetryMessageDocument,
    "\n  query Utilisation($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      utilisation {\n        machine {\n          id\n          name\n        }\n        bookedHours\n        bookingCount\n      }\n    }\n  }\n": typeof types.UtilisationDocument,
    "\n  query Viewer {\n    viewer {\n      user {\n        id\n        name\n      }\n      memberships {\n        id\n        role\n        workspace {\n          name\n          slug\n        }\n      }\n    }\n  }\n": typeof types.ViewerDocument,
    "\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignOut {\n    signOut {\n      signedOut\n    }\n  }\n": typeof types.SignOutDocument,
    "\n  mutation AcceptInvitation($token: String!, $password: String!) {\n    acceptInvitation(token: $token, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.AcceptInvitationDocument,
    "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.ChangePasswordDocument,
};
const documents: Documents = {
    "\n  query WorkspaceOverview($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      name\n      slug\n      timeZone\n      today\n      opensAt\n      closesAt\n      holdMinutes\n      maxActiveHolds\n      bookingHorizonDays\n      viewerRole\n    }\n  }\n": types.WorkspaceOverviewDocument,
    "\n  query Availability($slug: String!, $date: ISO8601Date!) {\n    workspace(slug: $slug) {\n      id\n      availability(date: $date) {\n        machine {\n          id\n          name\n          description\n          slotMinutes\n        }\n        slots {\n          startsAt\n          endsAt\n          state\n          bookingId\n        }\n      }\n    }\n  }\n": types.AvailabilityDocument,
    "\n  fragment BookingFields on Booking {\n    id\n    status\n    startsAt\n    endsAt\n    holdExpiresAt\n    machine {\n      id\n      name\n    }\n  }\n": types.BookingFieldsFragmentDoc,
    "\n  query MyBookings($slug: String!, $upcoming: Boolean!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      myBookings(upcoming: $upcoming, first: 10, after: $after) {\n        nodes {\n          ...BookingFields\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.MyBookingsDocument,
    "\n  query MyHolds($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      myHolds {\n        ...BookingFields\n      }\n    }\n  }\n": types.MyHoldsDocument,
    "\n  mutation PlaceHold($machineId: ID!, $startsAt: ISO8601DateTime!) {\n    placeHold(machineId: $machineId, startsAt: $startsAt) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.PlaceHoldDocument,
    "\n  mutation ConfirmBooking($bookingId: ID!) {\n    confirmBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.ConfirmBookingDocument,
    "\n  mutation ReleaseHold($bookingId: ID!) {\n    releaseHold(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.ReleaseHoldDocument,
    "\n  mutation CancelBooking($bookingId: ID!) {\n    cancelBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.CancelBookingDocument,
    "\n  query DaySheet($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      name\n      today\n      timeZone\n      daySheet {\n        id\n        startsAt\n        endsAt\n        arrivedAt\n        machine {\n          id\n          name\n        }\n        member {\n          name\n        }\n      }\n    }\n  }\n": types.DaySheetDocument,
    "\n  mutation MarkArrival($bookingId: ID!, $arrived: Boolean!) {\n    markArrival(bookingId: $bookingId, arrived: $arrived) {\n      booking {\n        id\n        arrivedAt\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.MarkArrivalDocument,
    "\n  query Machines($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      machines(includeRetired: true) {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n    }\n  }\n": types.MachinesDocument,
    "\n  mutation CreateMachine($name: String!, $description: String, $slotMinutes: Int!) {\n    createMachine(name: $name, description: $description, slotMinutes: $slotMinutes) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.CreateMachineDocument,
    "\n  mutation UpdateMachine($machineId: ID!, $name: String, $description: String, $slotMinutes: Int) {\n    updateMachine(\n      machineId: $machineId\n      name: $name\n      description: $description\n      slotMinutes: $slotMinutes\n    ) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.UpdateMachineDocument,
    "\n  mutation RetireMachine($machineId: ID!) {\n    retireMachine(machineId: $machineId) {\n      machine {\n        id\n        retired\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.RetireMachineDocument,
    "\n  fragment StaffMemberFields on StaffMember {\n    id\n    name\n    email\n    role\n    invitationPending\n    isViewer\n  }\n": types.StaffMemberFieldsFragmentDoc,
    "\n  query Team($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      team {\n        ...StaffMemberFields\n      }\n    }\n  }\n": types.TeamDocument,
    "\n  mutation AddTeamMember($name: String!, $email: String!, $password: String, $role: Role!) {\n    addTeamMember(name: $name, email: $email, password: $password, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.AddTeamMemberDocument,
    "\n  mutation ChangeTeamRole($membershipId: ID!, $role: Role!) {\n    changeTeamRole(membershipId: $membershipId, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.ChangeTeamRoleDocument,
    "\n  mutation RemoveTeamMember($membershipId: ID!) {\n    removeTeamMember(membershipId: $membershipId) {\n      removedId\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.RemoveTeamMemberDocument,
    "\n  query MessageTemplates($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      messageTemplates {\n        kind\n        subject\n        body\n        customised\n      }\n    }\n  }\n": types.MessageTemplatesDocument,
    "\n  query MessagePreview($slug: String!, $kind: MessageKind!, $subject: String!, $body: String!) {\n    workspace(slug: $slug) {\n      id\n      messagePreview(kind: $kind, subject: $subject, body: $body) {\n        subject\n        body\n        problems\n      }\n    }\n  }\n": types.MessagePreviewDocument,
    "\n  mutation SaveMessageTemplate($kind: MessageKind!, $subject: String!, $body: String!) {\n    saveMessageTemplate(kind: $kind, subject: $subject, body: $body) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.SaveMessageTemplateDocument,
    "\n  mutation ResetMessageTemplate($kind: MessageKind!) {\n    resetMessageTemplate(kind: $kind) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.ResetMessageTemplateDocument,
    "\n  query Outbox($slug: String!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      outbox(first: 15, after: $after) {\n        nodes {\n          id\n          kind\n          recipient\n          subject\n          body\n          status\n          attempts\n          lastError\n          usedFallbackTemplate\n          createdAt\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.OutboxDocument,
    "\n  mutation RetryMessage($messageId: ID!) {\n    retryMessage(messageId: $messageId) {\n      message {\n        id\n        status\n        attempts\n        lastError\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.RetryMessageDocument,
    "\n  query Utilisation($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      utilisation {\n        machine {\n          id\n          name\n        }\n        bookedHours\n        bookingCount\n      }\n    }\n  }\n": types.UtilisationDocument,
    "\n  query Viewer {\n    viewer {\n      user {\n        id\n        name\n      }\n      memberships {\n        id\n        role\n        workspace {\n          name\n          slug\n        }\n      }\n    }\n  }\n": types.ViewerDocument,
    "\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignOut {\n    signOut {\n      signedOut\n    }\n  }\n": types.SignOutDocument,
    "\n  mutation AcceptInvitation($token: String!, $password: String!) {\n    acceptInvitation(token: $token, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.AcceptInvitationDocument,
    "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.ChangePasswordDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query WorkspaceOverview($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      name\n      slug\n      timeZone\n      today\n      opensAt\n      closesAt\n      holdMinutes\n      maxActiveHolds\n      bookingHorizonDays\n      viewerRole\n    }\n  }\n"): (typeof documents)["\n  query WorkspaceOverview($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      name\n      slug\n      timeZone\n      today\n      opensAt\n      closesAt\n      holdMinutes\n      maxActiveHolds\n      bookingHorizonDays\n      viewerRole\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Availability($slug: String!, $date: ISO8601Date!) {\n    workspace(slug: $slug) {\n      id\n      availability(date: $date) {\n        machine {\n          id\n          name\n          description\n          slotMinutes\n        }\n        slots {\n          startsAt\n          endsAt\n          state\n          bookingId\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Availability($slug: String!, $date: ISO8601Date!) {\n    workspace(slug: $slug) {\n      id\n      availability(date: $date) {\n        machine {\n          id\n          name\n          description\n          slotMinutes\n        }\n        slots {\n          startsAt\n          endsAt\n          state\n          bookingId\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BookingFields on Booking {\n    id\n    status\n    startsAt\n    endsAt\n    holdExpiresAt\n    machine {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  fragment BookingFields on Booking {\n    id\n    status\n    startsAt\n    endsAt\n    holdExpiresAt\n    machine {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyBookings($slug: String!, $upcoming: Boolean!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      myBookings(upcoming: $upcoming, first: 10, after: $after) {\n        nodes {\n          ...BookingFields\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query MyBookings($slug: String!, $upcoming: Boolean!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      myBookings(upcoming: $upcoming, first: 10, after: $after) {\n        nodes {\n          ...BookingFields\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyHolds($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      myHolds {\n        ...BookingFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query MyHolds($slug: String!) {\n    serverTime\n    workspace(slug: $slug) {\n      id\n      myHolds {\n        ...BookingFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PlaceHold($machineId: ID!, $startsAt: ISO8601DateTime!) {\n    placeHold(machineId: $machineId, startsAt: $startsAt) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation PlaceHold($machineId: ID!, $startsAt: ISO8601DateTime!) {\n    placeHold(machineId: $machineId, startsAt: $startsAt) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ConfirmBooking($bookingId: ID!) {\n    confirmBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ConfirmBooking($bookingId: ID!) {\n    confirmBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReleaseHold($bookingId: ID!) {\n    releaseHold(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ReleaseHold($bookingId: ID!) {\n    releaseHold(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CancelBooking($bookingId: ID!) {\n    cancelBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CancelBooking($bookingId: ID!) {\n    cancelBooking(bookingId: $bookingId) {\n      booking {\n        ...BookingFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DaySheet($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      name\n      today\n      timeZone\n      daySheet {\n        id\n        startsAt\n        endsAt\n        arrivedAt\n        machine {\n          id\n          name\n        }\n        member {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query DaySheet($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      name\n      today\n      timeZone\n      daySheet {\n        id\n        startsAt\n        endsAt\n        arrivedAt\n        machine {\n          id\n          name\n        }\n        member {\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkArrival($bookingId: ID!, $arrived: Boolean!) {\n    markArrival(bookingId: $bookingId, arrived: $arrived) {\n      booking {\n        id\n        arrivedAt\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MarkArrival($bookingId: ID!, $arrived: Boolean!) {\n    markArrival(bookingId: $bookingId, arrived: $arrived) {\n      booking {\n        id\n        arrivedAt\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Machines($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      machines(includeRetired: true) {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n    }\n  }\n"): (typeof documents)["\n  query Machines($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      machines(includeRetired: true) {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateMachine($name: String!, $description: String, $slotMinutes: Int!) {\n    createMachine(name: $name, description: $description, slotMinutes: $slotMinutes) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateMachine($name: String!, $description: String, $slotMinutes: Int!) {\n    createMachine(name: $name, description: $description, slotMinutes: $slotMinutes) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateMachine($machineId: ID!, $name: String, $description: String, $slotMinutes: Int) {\n    updateMachine(\n      machineId: $machineId\n      name: $name\n      description: $description\n      slotMinutes: $slotMinutes\n    ) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateMachine($machineId: ID!, $name: String, $description: String, $slotMinutes: Int) {\n    updateMachine(\n      machineId: $machineId\n      name: $name\n      description: $description\n      slotMinutes: $slotMinutes\n    ) {\n      machine {\n        id\n        name\n        description\n        slotMinutes\n        retired\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RetireMachine($machineId: ID!) {\n    retireMachine(machineId: $machineId) {\n      machine {\n        id\n        retired\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RetireMachine($machineId: ID!) {\n    retireMachine(machineId: $machineId) {\n      machine {\n        id\n        retired\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment StaffMemberFields on StaffMember {\n    id\n    name\n    email\n    role\n    invitationPending\n    isViewer\n  }\n"): (typeof documents)["\n  fragment StaffMemberFields on StaffMember {\n    id\n    name\n    email\n    role\n    invitationPending\n    isViewer\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Team($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      team {\n        ...StaffMemberFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query Team($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      team {\n        ...StaffMemberFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddTeamMember($name: String!, $email: String!, $password: String, $role: Role!) {\n    addTeamMember(name: $name, email: $email, password: $password, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddTeamMember($name: String!, $email: String!, $password: String, $role: Role!) {\n    addTeamMember(name: $name, email: $email, password: $password, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangeTeamRole($membershipId: ID!, $role: Role!) {\n    changeTeamRole(membershipId: $membershipId, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangeTeamRole($membershipId: ID!, $role: Role!) {\n    changeTeamRole(membershipId: $membershipId, role: $role) {\n      teamMember {\n        ...StaffMemberFields\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveTeamMember($membershipId: ID!) {\n    removeTeamMember(membershipId: $membershipId) {\n      removedId\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveTeamMember($membershipId: ID!) {\n    removeTeamMember(membershipId: $membershipId) {\n      removedId\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MessageTemplates($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      messageTemplates {\n        kind\n        subject\n        body\n        customised\n      }\n    }\n  }\n"): (typeof documents)["\n  query MessageTemplates($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      messageTemplates {\n        kind\n        subject\n        body\n        customised\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MessagePreview($slug: String!, $kind: MessageKind!, $subject: String!, $body: String!) {\n    workspace(slug: $slug) {\n      id\n      messagePreview(kind: $kind, subject: $subject, body: $body) {\n        subject\n        body\n        problems\n      }\n    }\n  }\n"): (typeof documents)["\n  query MessagePreview($slug: String!, $kind: MessageKind!, $subject: String!, $body: String!) {\n    workspace(slug: $slug) {\n      id\n      messagePreview(kind: $kind, subject: $subject, body: $body) {\n        subject\n        body\n        problems\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveMessageTemplate($kind: MessageKind!, $subject: String!, $body: String!) {\n    saveMessageTemplate(kind: $kind, subject: $subject, body: $body) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SaveMessageTemplate($kind: MessageKind!, $subject: String!, $body: String!) {\n    saveMessageTemplate(kind: $kind, subject: $subject, body: $body) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetMessageTemplate($kind: MessageKind!) {\n    resetMessageTemplate(kind: $kind) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ResetMessageTemplate($kind: MessageKind!) {\n    resetMessageTemplate(kind: $kind) {\n      template {\n        kind\n        subject\n        body\n        customised\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Outbox($slug: String!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      outbox(first: 15, after: $after) {\n        nodes {\n          id\n          kind\n          recipient\n          subject\n          body\n          status\n          attempts\n          lastError\n          usedFallbackTemplate\n          createdAt\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Outbox($slug: String!, $after: String) {\n    workspace(slug: $slug) {\n      id\n      outbox(first: 15, after: $after) {\n        nodes {\n          id\n          kind\n          recipient\n          subject\n          body\n          status\n          attempts\n          lastError\n          usedFallbackTemplate\n          createdAt\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RetryMessage($messageId: ID!) {\n    retryMessage(messageId: $messageId) {\n      message {\n        id\n        status\n        attempts\n        lastError\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RetryMessage($messageId: ID!) {\n    retryMessage(messageId: $messageId) {\n      message {\n        id\n        status\n        attempts\n        lastError\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Utilisation($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      utilisation {\n        machine {\n          id\n          name\n        }\n        bookedHours\n        bookingCount\n      }\n    }\n  }\n"): (typeof documents)["\n  query Utilisation($slug: String!) {\n    workspace(slug: $slug) {\n      id\n      utilisation {\n        machine {\n          id\n          name\n        }\n        bookedHours\n        bookingCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Viewer {\n    viewer {\n      user {\n        id\n        name\n      }\n      memberships {\n        id\n        role\n        workspace {\n          name\n          slug\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Viewer {\n    viewer {\n      user {\n        id\n        name\n      }\n      memberships {\n        id\n        role\n        workspace {\n          name\n          slug\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignOut {\n    signOut {\n      signedOut\n    }\n  }\n"): (typeof documents)["\n  mutation SignOut {\n    signOut {\n      signedOut\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AcceptInvitation($token: String!, $password: String!) {\n    acceptInvitation(token: $token, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AcceptInvitation($token: String!, $password: String!) {\n    acceptInvitation(token: $token, password: $password) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {\n    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {\n      viewer {\n        user {\n          id\n        }\n      }\n      errors {\n        code\n        message\n        field\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;