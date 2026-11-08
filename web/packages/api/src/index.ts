/**
 * The typed API layer for both Booking Kiosk apps: GraphQL documents with generated
 * `TypedDocumentNode` types, the Apollo client factory and error helpers.
 * Apps import operations only from here (an ESLint rule refuses `graphql-tag`).
 *
 * @packageDocumentation
 */
export { createBookingKioskClient, workspaceFromPath, WORKSPACE_HEADER } from './client';
export { describeFailure, errorCode, firstUserError, type UserErrorLike } from './errors';
export {
  recordServerTime,
  serverClockLink,
  serverClockMeasuredAt,
  serverClockOffset,
  subscribeToServerClock,
} from './serverClock';
export * from './operations/session';
export * from './operations/booking';
export * from './operations/frontDesk';
export * from './operations/manage';
export type * from './generated/graphql';
