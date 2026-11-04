import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy for the production build only (the dev server injects inline
// scripts for hot reload, which this policy would block).
// script-src 'self' stops injected inline scripts, event-handler attributes and javascript:
// URLs from running even if an XSS bug slips through. API / upload hosts may be on another
// origin (VITE_API_URL), so connect/img/frame allow http(s) but never script.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: http: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' http: https:",
  "frame-src 'self' blob: http: https:",
].join('; ');

function cspPlugin() {
  return {
    name: 'gitoffice-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  server: {
    host: true,
    port: 3003,
    strictPort: true
  }
});
