// @ts-check
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  envDir: '../../',
  envPrefix: ['PUBLIC_'],
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
        '/api/auth': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/me': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/users': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/role-applications': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/phone': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/posts': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/books': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/search': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/wishlist': { target: 'http://127.0.0.1:4000', changeOrigin: true },
        '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      },
    },
  },
});
