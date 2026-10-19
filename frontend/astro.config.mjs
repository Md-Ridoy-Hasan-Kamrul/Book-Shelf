// @ts-check
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

/**
 * HTML page navigations must hit Astro SSR.
 * Without this, `/seller/dashboard` and `/admin/dashboard` are proxied to :4000
 * and return 502 when the API is down (mock-first workflow).
 */
/** @param {import('http').IncomingMessage} req */
function bypassHtml(req) {
  const accept = req.headers.accept ?? '';
  if (typeof accept === 'string' && accept.includes('text/html')) {
    return req.url;
  }
}

/** @param {boolean} [ws] */
function toApi(ws = false) {
  return {
    target: 'http://127.0.0.1:4000',
    changeOrigin: true,
    bypass: bypassHtml,
    ...(ws ? { ws: true } : {}),
  };
}

export default defineConfig({
  envDir: '../',
  // FEATURE_* exposed for UI gating (AGENTS rule 15); not secrets
  envPrefix: ['PUBLIC_', 'FEATURE_'],
  site: 'http://localhost:4321',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api/auth': toApi(),
        '/me': toApi(),
        '/users': toApi(),
        '/role-applications': toApi(),
        '/phone': toApi(),
        '/posts': toApi(),
        '/books': toApi(),
        '/search': toApi(),
        '/wishlist': toApi(),
        '/uploads': toApi(),
        '/checkout': toApi(),
        '/orders': toApi(),
        '/addresses': toApi(),
        '/payments': toApi(),
        '/admin/money': toApi(),
        '/seller/dashboard': toApi(),
        '/admin/dashboard': toApi(),
        '/reviews': toApi(),
        '/notifications': toApi(),
        '/bookshelf': toApi(),
        '/isbn': toApi(),
        '/used-listings': toApi(),
        '/discover': toApi(),
        '/publisher': toApi(),
        '/publishers': toApi(),
        '/writer': toApi(),
        '/seller': toApi(),
        '/socket.io': toApi(true),
      },
    },
  },
});
