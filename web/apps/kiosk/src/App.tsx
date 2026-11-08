// The kiosk's routes: a workspace picker and one front-desk page per workspace.
import { createBrowserRouter, RouterProvider } from 'react-router';
import { DeskPage } from './DeskPage';
import { KioskRoot, WorkspacePicker } from './KioskRoot';

const router = createBrowserRouter([
  {
    path: '/',
    element: <KioskRoot />,
    children: [
      { index: true, element: <WorkspacePicker /> },
      { path: 'w/:slug', element: <DeskPage /> },
      { path: '*', element: <WorkspacePicker /> },
    ],
  },
]);

/** The kiosk app: its router, rendered inside the Apollo provider from `main.tsx`. */
export function App() {
  return <RouterProvider router={router} />;
}
