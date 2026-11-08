// The signed-in viewer, handed from Root to every route below it.
import type { ViewerQuery as ViewerData } from '@booking-kiosk/api';
import { useOutletContext } from 'react-router';

/** The signed-in person as the `Viewer` query returns it. */
export type Viewer = NonNullable<ViewerData['viewer']>;

/** What `Root` passes to its child routes through the outlet context. */
export interface RootContext {
  /** The signed-in person; child routes render only when there is one. */
  readonly viewer: Viewer;
}

/** The signed-in viewer, for any component rendered under `Root`. */
export function useViewer(): Viewer {
  return useOutletContext<RootContext>().viewer;
}
