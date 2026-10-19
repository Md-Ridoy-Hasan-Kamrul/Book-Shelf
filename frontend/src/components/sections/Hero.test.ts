import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/react';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hero from './Hero.astro';

test('Hero renders BookVerse marketplace CTAs', async () => {
  const renderers = await loadRenderers([getContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });
  const result = await container.renderToString(Hero);

  expect(result).toContain('id="hero-title"');
  expect(result).toContain('BookVerse');
  expect(result).toContain('href="/mood"');
  expect(result).toContain('href="/search"');
  expect(result).not.toContain('starter-kit');
});
