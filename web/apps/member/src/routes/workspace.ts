// The current workspace and its "today", for pages under /w/:slug.
import type { WorkspaceOverviewQuery } from '@booking-kiosk/api';
import { dateInZone, useServerNow } from '@booking-kiosk/ui';
import { useOutletContext } from 'react-router';

/** The workspace facts loaded by `WorkspaceLayout` (zone, hours, hold rules, role). */
export type Workspace = NonNullable<WorkspaceOverviewQuery['workspace']>;

/** The workspace loaded by WorkspaceLayout, available to every page below it. */
export function useWorkspace(): Workspace {
  return useOutletContext<{ workspace: Workspace }>().workspace;
}

/**
 * Today's date in the workspace's zone. It starts from the server's answer and
 * moves on at midnight on the server's clock, so a page left open overnight
 * never asks for yesterday, and a device whose clock runs fast never asks for
 * a day past the booking horizon.
 *
 * @param workspace - The workspace from {@link useWorkspace}.
 * @returns A calendar date, `YYYY-MM-DD`.
 */
export function useWorkspaceToday(workspace: Workspace): string {
  const now = useServerNow(60_000);
  const local = dateInZone(new Date(now).toISOString(), workspace.timeZone);
  return local > workspace.today ? local : workspace.today;
}
