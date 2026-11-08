// How each slot state is labelled and whether it can be chosen, plus hold error wording.
import type { SlotState } from '@booking-kiosk/api';

/** How one slot is shown in the grid. */
export interface SlotPresentation {
  /** The state in words, part of the slot button's accessible name. */
  readonly label: string;
  /** Whether the slot button is enabled. */
  readonly selectable: boolean;
  /** Which style the slot uses; each tone also differs in text, not colour alone. */
  readonly tone: 'free' | 'taken' | 'mine' | 'held' | 'past';
}

const PRESENTATION: Readonly<Record<SlotState, SlotPresentation>> = {
  FREE: { label: 'free', selectable: true, tone: 'free' },
  TAKEN: { label: 'taken', selectable: false, tone: 'taken' },
  HELD_BY_YOU: { label: 'held by you', selectable: false, tone: 'held' },
  BOOKED_BY_YOU: { label: 'booked by you', selectable: false, tone: 'mine' },
  PAST: { label: 'already started', selectable: false, tone: 'past' },
};

/**
 * The label, tone and selectability for a slot state from the API.
 *
 * @param state - A `SlotState` value.
 * @example
 * ```ts
 * presentSlot('FREE'); // { label: 'free', selectable: true, tone: 'free' }
 * ```
 */
export function presentSlot(state: SlotState): SlotPresentation {
  return PRESENTATION[state];
}

/**
 * Friendlier wording for the codes the hold mutation can return.
 *
 * @param code - The `ErrorCode` from the `placeHold` payload.
 * @param fallback - The API's own message, used for every other code.
 */
export function holdErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'SLOT_TAKEN':
      return 'Someone else got that slot first. The grid has been refreshed.';
    case 'SLOT_IN_PAST':
      return 'That slot has just started. Pick a later one.';
    default:
      return fallback;
  }
}
