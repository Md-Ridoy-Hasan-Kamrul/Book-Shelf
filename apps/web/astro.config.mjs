// @ts-check
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
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
	},
});
