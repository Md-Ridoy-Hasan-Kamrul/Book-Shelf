/** Optional: seed ~100k books for search benchmark (local only). */
import { PrismaClient } from '@prisma/client';
import { GENRES, BANGLA_TITLES, ENGLISH_TITLES, AUTHORS } from './seed-data.js';

const prisma = new PrismaClient();
const TARGET = Number(process.env.BENCH_BOOK_COUNT ?? 100_000);

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function main() {
  const existing = await prisma.book.count();
  if (existing >= TARGET) {
    console.log(`Already ${existing} books — skip bench seed`);
    return;
  }
  const genres = await prisma.genre.findMany();
  const publisher = await prisma.publisherProfile.findFirst();
  if (!genres.length || !publisher) {
    throw new Error('Run pnpm db:seed first');
  }

  console.log(`Bench seed from ${existing} → ${TARGET}…`);
  const batch = 500;
  for (let i = existing; i < TARGET; i += batch) {
    const rows = Array.from({ length: Math.min(batch, TARGET - i) }, (_, j) => {
      const idx = i + j;
      const titleEn = `${ENGLISH_TITLES[idx % ENGLISH_TITLES.length]} ${idx}`;
      return {
        slug: slugify(`bench-${idx}-${titleEn}`),
        title: titleEn,
        titleBn: `${BANGLA_TITLES[idx % BANGLA_TITLES.length]} ${idx}`,
        author: AUTHORS[idx % AUTHORS.length].en,
        authorBn: AUTHORS[idx % AUTHORS.length].bn,
        description: `Bench book ${idx}`,
        genreId: genres[idx % genres.length].id,
        publisherId: publisher.id,
        moodTags: ['calm'],
        language: idx % 3 === 0 ? 'en' : 'bn',
      };
    });
    await prisma.book.createMany({ data: rows, skipDuplicates: true });
    if (i % 5000 === 0) console.log(`… ${i} books`);
  }
  console.log('✅ Bench seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
