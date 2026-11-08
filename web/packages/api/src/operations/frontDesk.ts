// Typed GraphQL documents for the front-desk kiosk.
import { graphql } from '../generated';

/** Today's confirmed bookings in the workspace, for front-desk staff and managers. */
export const daySheetQuery = graphql(`
  query DaySheet($slug: String!) {
    workspace(slug: $slug) {
      id
      name
      today
      timeZone
      daySheet {
        id
        startsAt
        endsAt
        arrivedAt
        machine {
          id
          name
        }
        member {
          name
        }
      }
    }
  }
`);

/** Records (`arrived: true`) or undoes an arrival for one of today's bookings. */
export const markArrivalMutation = graphql(`
  mutation MarkArrival($bookingId: ID!, $arrived: Boolean!) {
    markArrival(bookingId: $bookingId, arrived: $arrived) {
      booking {
        id
        arrivedAt
      }
      errors {
        code
        message
      }
    }
  }
`);
