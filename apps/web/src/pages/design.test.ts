import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/react';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Design from './design.astro';

test('Design page documents Fresh & Human palette v2', async () => {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const html = await container.renderToString(Design);

	expect(html).toContain('Fresh &amp; Human');
	expect(html).toContain('WCAG AA');
	expect(html).toContain('bg-mood-happy-bg');
	expect(html).toContain('পাঠক প্রতিক্রিয়া');
});
