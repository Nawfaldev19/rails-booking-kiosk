// Shared outcome handling for manager forms: one message plus per-field errors.
import { describeFailure, type UserErrorLike } from '@booking-kiosk/api';
import { useState } from 'react';

/** The single message a manager form shows after an action. */
export interface ActionMessage {
  /** Whether the action worked. */
  readonly tone: 'error' | 'success';
  /** The sentence to show. */
  readonly text: string;
}

/**
 * Runs a mutation that reports typed errors, and turns the outcome into one
 * message plus a map of per-field errors for forms.
 *
 * @returns `run(perform, success)`, which resolves to true when the mutation
 *   returned no errors; `message`, the outcome to show; and `fieldErrors`,
 *   keyed by the API's camelCase `field` names. `success` may be a function,
 *   called after `perform`, when the wording depends on the result.
 */
export function useAction() {
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});

  const run = async (
    perform: () => Promise<readonly (UserErrorLike & { field?: string | null })[] | undefined>,
    success: string | (() => string),
  ): Promise<boolean> => {
    setMessage(null);
    setFieldErrors({});
    try {
      const errors = (await perform()) ?? [];
      if (errors.length === 0) {
        setMessage({ tone: 'success', text: typeof success === 'string' ? success : success() });
        return true;
      }
      const byField: Record<string, string> = {};
      const general: string[] = [];
      for (const error of errors) {
        if (error.field) byField[error.field] = error.message;
        else general.push(error.message);
      }
      setFieldErrors(byField);
      setMessage({
        tone: 'error',
        text: general.join(' ') || 'Please fix the highlighted fields.',
      });
      return false;
    } catch (failure) {
      setMessage({ tone: 'error', text: describeFailure(failure) });
      return false;
    }
  };

  return { message, fieldErrors, run };
}
