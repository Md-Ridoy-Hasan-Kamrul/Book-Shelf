import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/react';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Features from './Features.astro';

test('Features section renders the starter cards', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const result = await container.renderToString(Features);

	expect(result).toContain('id="features"');
	expect(result).toContain('Astro pages');
	expect(result).toContain('React islands');
	expect(result).toContain('Clear folders');
});
