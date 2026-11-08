// The Apollo client factory both apps use, and the workspace-scoping header.
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { serverClockLink } from './serverClock';

/** The request header that names the workspace a mutation acts in. */
export const WORKSPACE_HEADER = 'X-Booking-Kiosk-Workspace';

/**
 * Reads the workspace slug from paths shaped like `/w/:slug/...`.
 *
 * @param pathname - A URL path, such as `window.location.pathname`.
 * @returns The slug, or null when the path is not inside a workspace.
 * @example
 * ```ts
 * workspaceFromPath('/w/larkspur/book'); // "larkspur"
 * workspaceFromPath('/sign-in'); // null
 * ```
 */
export function workspaceFromPath(pathname: string): string | null {
  const match = /^\/w\/([a-z0-9-]+)(?:\/|$)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * One Apollo client per app. Mutations are scoped by the X-Booking-Kiosk-Workspace
 * header, taken from the URL at request time, so a link never holds stale state.
 * Queries name the workspace explicitly (`workspace(slug:)`), which also keeps
 * each workspace's data in its own cache entry.
 *
 * @param uri - The GraphQL endpoint; same-origin, so the session cookie is first-party.
 * @defaultValue `uri` is `/graphql`.
 * @see docs/adr/0007-same-origin-clients-and-cookie-sessions.md
 */
export function createBookingKioskClient(uri = '/graphql') {
  const workspaceHeader = new SetContextLink((previous) => {
    const slug = workspaceFromPath(window.location.pathname);
    const headers = (previous.headers ?? {}) as Record<string, string>;
    return { headers: slug ? { ...headers, [WORKSPACE_HEADER]: slug } : headers };
  });

  return new ApolloClient({
    link: ApolloLink.from([
      workspaceHeader,
      serverClockLink,
      new HttpLink({ uri, credentials: 'same-origin' }),
    ]),
    cache: new InMemoryCache({
      typePolicies: {
        Workspace: {
          fields: {
            myBookings: { keyArgs: ['upcoming'], merge: mergeConnection },
            outbox: { keyArgs: false, merge: mergeConnection },
          },
        },
      },
    }),
  });
}

interface ConnectionShape {
  nodes?: readonly unknown[];
  pageInfo?: unknown;
}

/** Appends a "load more" page to the cached list; a first page replaces it. */
function mergeConnection(
  existing: ConnectionShape | undefined,
  incoming: ConnectionShape,
  { args }: { args: Record<string, unknown> | null },
): ConnectionShape {
  if (!existing || !args?.after) return incoming;
  return { ...incoming, nodes: [...(existing.nodes ?? []), ...(incoming.nodes ?? [])] };
}
