// Helpers that turn API failures into one message a person can read.
import { CombinedGraphQLErrors } from '@apollo/client';

/** The parts of a mutation's typed `UserError` that the clients read. */
export interface UserErrorLike {
  /** A stable `ErrorCode` value, such as `SLOT_TAKEN`. */
  readonly code: string;
  /** A sentence that can be shown as it is. */
  readonly message: string;
}

/**
 * Returns the first typed error from a mutation payload, so callers can show one message.
 *
 * @param errors - A payload's `errors` list.
 * @returns The first error, or null when the mutation succeeded.
 */
export function firstUserError(
  errors: readonly UserErrorLike[] | undefined | null,
): UserErrorLike | null {
  return errors && errors.length > 0 ? (errors[0] ?? null) : null;
}

/**
 * The `extensions.code` of a query-level GraphQL error (such as FORBIDDEN), if there is one.
 *
 * @param error - Whatever a query reported as its error.
 * @returns The code, or null for network failures and errors without one.
 */
export function errorCode(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  const code = error.errors.find((e) => typeof e.extensions?.code === 'string')?.extensions?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * A readable message for errors that are not typed payload errors (network, server).
 *
 * @param error - Anything caught from a query or mutation.
 * @example
 * ```ts
 * describeFailure(new TypeError('Failed to fetch'));
 * // "Cannot reach the server. Check your connection and try again."
 * ```
 */
export function describeFailure(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (/Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
