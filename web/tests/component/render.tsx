import { ApolloLink, type ApolloCache } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { serverClockLink } from '@booking-kiosk/api';
import type { ReactNode } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { render } from 'vitest-browser-react';

interface Options {
  readonly mocks: readonly MockLink.MockedResponse[];
  readonly path?: string;
  readonly url?: string;
  readonly outletContext?: unknown;
  /** A cache to start from, for tests about what is shown before the network answers. */
  readonly cache?: ApolloCache;
}

/**
 * Renders a page inside a real router and a mocked GraphQL link. Only the
 * network is replaced; components, hooks, the Apollo cache and the app's
 * server-clock link are real.
 */
export function renderPage(
  element: ReactNode,
  { mocks, path = '/', url = '/', outletContext, cache }: Options,
) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Outlet context={outletContext} />,
        children: [{ path: path.replace(/^\//, ''), element }],
      },
    ],
    { initialEntries: [url] },
  );
  return render(
    <MockedProvider link={ApolloLink.from([serverClockLink, new MockLink(mocks)])} cache={cache}>
      <RouterProvider router={router} />
    </MockedProvider>,
  );
}

/** Reuse a mock for every request (polling, refetches). */
export function always<T extends MockLink.MockedResponse>(mock: T): T {
  return { ...mock, maxUsageCount: Number.POSITIVE_INFINITY };
}
