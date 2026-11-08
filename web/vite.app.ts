/**
 * The Vite configuration both apps share (each app's `vite.config.ts` re-exports it).
 *
 * The browser talks to its own origin and Vite forwards /graphql to the Rails
 * API, so the session cookie stays first-party and no CORS is needed. The proxy
 * sets X-Forwarded-For to the address of the connection it received, replacing
 * anything the client sent, so the API's per-address sign-in limit sees real
 * clients when it trusts this proxy (TRUSTED_PROXIES; see
 * docs/reference/configuration.md).
 *
 * @packageDocumentation
 */
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';
import { devHeaders, previewHeaders } from './security-headers.ts';

const api = process.env.BOOKING_KIOSK_API_URL ?? 'http://localhost:3300';

const proxy: Record<string, ProxyOptions> = {
  '/graphql': {
    target: api,
    changeOrigin: false,
    configure: (server) => {
      server.on('proxyReq', (proxyReq, request) => {
        proxyReq.setHeader('X-Forwarded-For', request.socket.remoteAddress ?? '');
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  // Shared static files: the favicon and theme-init.js.
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  server: { proxy, headers: devHeaders },
  preview: { proxy, headers: previewHeaders },
  build: { sourcemap: true },
});
