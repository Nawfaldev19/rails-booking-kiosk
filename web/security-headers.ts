/**
 * HTTP response headers for the apps' Vite servers.
 *
 * The production build (served by `vite preview` in the end-to-end tests, and
 * the model for a production reverse proxy) gets a strict Content Security
 * Policy: every script, style, font and request comes from the app's own
 * origin. The dev server gets the same headers without the policy, because
 * Vite's hot reload injects an inline script and opens a WebSocket.
 *
 * @see docs/security/threat-model.md
 */

const common = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
} as const;

/**
 * The Content Security Policy for built apps. Fonts may be inlined by Vite as
 * `data:` URLs, so `font-src` allows them; nothing else may load from outside
 * the origin, and the apps may not be framed.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Headers for `vite preview`, which serves the production build. */
export const previewHeaders = { ...common, 'Content-Security-Policy': CONTENT_SECURITY_POLICY };

/** Headers for the `vite` dev server: the same, minus the Content Security Policy. */
export const devHeaders = common;
