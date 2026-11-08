/**
 * The shared UI kit for both Booking Kiosk apps: design-token styles, accessible
 * components (header with skip link, notices, sign-in, form fields) and the
 * time helpers that keep every date in the workspace's zone.
 *
 * @packageDocumentation
 */
export { AppHeader } from './components/AppHeader';
export { Button } from './components/Button';
export { ErrorNotice } from './components/ErrorNotice';
export { Notice } from './components/Notice';
export { DEMO_PASSWORD, SignInPanel, type DemoAccount } from './components/SignInPanel';
export { EmptyState, LoadingBlock } from './components/States';
export { StatusPill } from './components/StatusPill';
export { TextField } from './components/TextField';
export * from './time';
export { useServerNow } from './useServerNow';
export { useNow } from './useNow';
export { useDocumentTitle } from './useDocumentTitle';
export { useSignOut } from './useSignOut';
export { useTheme } from './useTheme';
