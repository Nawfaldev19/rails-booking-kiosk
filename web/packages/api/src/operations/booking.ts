// Typed GraphQL documents for booking: the slot grid, holds and the member's bookings.
import { graphql } from '../generated';

/**
 * Workspace facts every member page needs: zone, opening hours, hold rules and
 * the viewer's role, plus the server clock for "today" and countdowns.
 */
export const workspaceOverviewQuery = graphql(`
  query WorkspaceOverview($slug: String!) {
    serverTime
    workspace(slug: $slug) {
      id
      name
      slug
      timeZone
      today
      opensAt
      closesAt
      holdMinutes
      maxActiveHolds
      bookingHorizonDays
      viewerRole
    }
  }
`);

/** The slot grid for one day: each in-service machine and the state of each slot for the viewer. */
export const availabilityQuery = graphql(`
  query Availability($slug: String!, $date: ISO8601Date!) {
    workspace(slug: $slug) {
      id
      availability(date: $date) {
        machine {
          id
          name
          description
          slotMinutes
        }
        slots {
          startsAt
          endsAt
          state
          bookingId
        }
      }
    }
  }
`);

/** The booking fields every booking list and mutation result shares. */
export const bookingFields = graphql(`
  fragment BookingFields on Booking {
    id
    status
    startsAt
    endsAt
    holdExpiresAt
    machine {
      id
      name
    }
  }
`);

/** One page (10) of the viewer's upcoming or past bookings; pass `after` to load more. */
export const myBookingsQuery = graphql(`
  query MyBookings($slug: String!, $upcoming: Boolean!, $after: String) {
    workspace(slug: $slug) {
      id
      myBookings(upcoming: $upcoming, first: 10, after: $after) {
        nodes {
          ...BookingFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

/** The viewer's open holds, plus the server clock so countdowns ignore a wrong device clock. */
export const myHoldsQuery = graphql(`
  query MyHolds($slug: String!) {
    serverTime
    workspace(slug: $slug) {
      id
      myHolds {
        ...BookingFields
      }
    }
  }
`);

/** Holds a free slot for a few minutes; a lost race returns the typed error `SLOT_TAKEN`. */
export const placeHoldMutation = graphql(`
  mutation PlaceHold($machineId: ID!, $startsAt: ISO8601DateTime!) {
    placeHold(machineId: $machineId, startsAt: $startsAt) {
      booking {
        ...BookingFields
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Turns the viewer's open hold into a booking; an expired hold returns `HOLD_EXPIRED`. */
export const confirmBookingMutation = graphql(`
  mutation ConfirmBooking($bookingId: ID!) {
    confirmBooking(bookingId: $bookingId) {
      booking {
        ...BookingFields
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Gives the viewer's hold back so others can take the slot. */
export const releaseHoldMutation = graphql(`
  mutation ReleaseHold($bookingId: ID!) {
    releaseHold(bookingId: $bookingId) {
      booking {
        ...BookingFields
      }
      errors {
        code
        message
      }
    }
  }
`);

/** Cancels a confirmed booking that has not started. */
export const cancelBookingMutation = graphql(`
  mutation CancelBooking($bookingId: ID!) {
    cancelBooking(bookingId: $bookingId) {
      booking {
        ...BookingFields
      }
      errors {
        code
        message
      }
    }
  }
`);
