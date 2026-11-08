// The member app's routes. Every page inside a workspace lives under /w/:slug.
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AccountPage } from './account/AccountPage';
import { AcceptInvitationPage } from './account/AcceptInvitationPage';
import { BookPage } from './booking/BookPage';
import { MyBookingsPage } from './booking/MyBookingsPage';
import { MachinesPage } from './manage/MachinesPage';
import { MessagesPage } from './manage/MessagesPage';
import { OutboxPage } from './manage/OutboxPage';
import { TeamPage } from './manage/TeamPage';
import { UsagePage } from './manage/UsagePage';
import { HomeRedirect, NotFoundPage } from './routes/HomeRedirect';
import { Root } from './routes/Root';
import { WorkspaceLayout } from './routes/WorkspaceLayout';

const router = createBrowserRouter([
  // Opened from an invitation message, before the person has a password.
  { path: '/invitation', element: <AcceptInvitationPage /> },
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'account', element: <AccountPage /> },
      {
        path: 'w/:slug',
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <BookPage /> },
          { path: 'bookings', element: <MyBookingsPage /> },
          { path: 'manage/machines', element: <MachinesPage /> },
          { path: 'manage/team', element: <TeamPage /> },
          { path: 'manage/messages', element: <MessagesPage /> },
          { path: 'manage/outbox', element: <OutboxPage /> },
          { path: 'manage/usage', element: <UsagePage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

/**
 * The member app: its router, rendered inside the Apollo provider from `main.tsx`.
 *
 * @remarks
 * Manager pages are routed for everyone and guard themselves with `ManagerOnly`;
 * the API enforces the role regardless.
 */
export function App() {
  return <RouterProvider router={router} />;
}
