import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

function planUsesIndex(planText: string, indexHint: string): boolean {
  const lower = planText.toLowerCase();
  return (
    lower.includes(indexHint.toLowerCase()) ||
    (lower.includes('bitmap') && lower.includes('gin')) ||
    lower.includes('gin index scan')
  );
}

async function explain(sql: string, params: unknown[] = []) {
  const res = await client.query(`EXPLAIN (FORMAT TEXT) ${sql}`, params);
  return res.rows.map((r) => r['QUERY PLAN']).join('\n');
}

async function main() {
  await client.connect();

  const bookRow = await client.query<{ id: string }>(`SELECT id FROM "Book" LIMIT 1`);
  const bookId = bookRow.rows[0]?.id;
  if (!bookId) {
    console.error('No books in database — run pnpm db:seed first');
    process.exit(1);
  }

  const titlePlan = await explain(`SELECT id FROM "Book" WHERE title % $1 LIMIT 20`, ['River']);
  if (!planUsesIndex(titlePlan, 'Book_title_trgm_idx')) {
    console.error('Title trigram search did not use GIN index:\n', titlePlan);
    process.exit(1);
  }

  const verifiedPlan = await explain(
    `SELECT id FROM "Review" WHERE "bookId" = $1 AND "isVerifiedBuyer" = true ORDER BY "createdAt" DESC LIMIT 10`,
    [bookId],
  );
  if (!planUsesIndex(verifiedPlan, 'Review_verified_buyer_book_idx')) {
    console.error('Verified-buyer review query did not use partial index:\n', verifiedPlan);
    process.exit(1);
  }

  console.log('✅ EXPLAIN checks passed (trigram title + verified-buyer partial index)');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
