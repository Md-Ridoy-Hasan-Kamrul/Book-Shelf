import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/react';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Design from './design.astro';

test('Design page shell mentions Fresh & Human', async () => {
  const renderers = await loadRenderers([getContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });
  const html = await container.renderToString(Design);

  expect(html).toContain('Fresh &amp; Human');
  expect(html).toContain('BookVerse');
});
