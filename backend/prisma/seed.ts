import { PostType, PrismaClient, SellerType, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { fromPaisa, splitCommission, toPaisa } from '@bookverse/shared';
import { createSaleLedgerForOrder } from '../src/services/money/ledgerService.js';
import {
  AUTHORS,
  BANGLA_TITLES,
  COMMISSION_RULES,
  DELIVERY_FEE_RULES,
  ENGLISH_TITLES,
  GENRES,
  MOOD_TAGS,
  ORDER_STATUS_TRANSITIONS,
  COURIER_STATUS_MAPPINGS,
  SEED_COUPONS,
  SYSTEM_SETTINGS,
} from './seed-data.js';

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function pickMoods(index: number): string[] {
  const a = MOOD_TAGS[index % MOOD_TAGS.length];
  const b = MOOD_TAGS[(index + 3) % MOOD_TAGS.length];
  return a === b ? [a] : [a, b];
}

function priceBdt(index: number): string {
  return (150 + (index % 40) * 25 + (index % 7) * 10).toFixed(2);
}

async function clearDatabase() {
  const tables = [
    'AdminAuditLog',
    'NotificationPreference',
    'Notification',
    'ClubMember',
    'BookClub',
    'ReprintRequest',
    'Block',
    'Follow',
    'Report',
    'Reaction',
    'Comment',
    'SavedPost',
    'ModerationLog',
    'Post',
    'Campaign',
    'ReadingGoal',
    'BookshelfItem',
    'MoodLog',
    'WishlistItem',
    'Review',
    'UserBadge',
    'SellerRating',
    'IsbnCache',
    'PointLedger',
    'LedgerEntry',
    'PaymentEvent',
    'Claim',
    'OrderStatusHistory',
    'OrderLineItem',
    'Order',
    'Payout',
    'PaymentIntent',
    'Checkout',
    'Coupon',
    'DeliveryFeeRule',
    'ShipmentEvent',
    'Shipment',
    'CourierWebhookEvent',
    'CourierStatusMapping',
    'OrderStatusTransition',
    'Address',
    'Listing',
    'RoleApplication',
    'Book',
    'WriterProfile',
    'PublisherProfile',
    'VendorProfile',
    'Genre',
    'CommissionRule',
    'SystemSetting',
    'Verification',
    'Session',
    'Account',
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

async function main() {
  console.log('🌱 BookVerse seed — clearing…');
  await clearDatabase();

  for (const [key, value] of Object.entries(SYSTEM_SETTINGS)) {
    await prisma.systemSetting.create({
      data: { key, value, updatedBy: 'seed' },
    });
  }

  for (const rule of COMMISSION_RULES) {
    await prisma.commissionRule.create({
      data: {
        name: rule.name,
        sellerType: rule.sellerType ?? undefined,
        genreSlug: rule.genreSlug,
        bps: rule.bps,
        priority: rule.priority,
        active: true,
      },
    });
  }

  for (const row of DELIVERY_FEE_RULES) {
    await prisma.deliveryFeeRule.create({ data: row });
  }

  for (const c of SEED_COUPONS) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        discountType: c.discountType,
        value: c.value,
        minSubtotal: c.minSubtotal ?? undefined,
        maxDiscount: c.maxDiscount ?? undefined,
        active: true,
      },
    });
  }

  for (const t of ORDER_STATUS_TRANSITIONS) {
    await prisma.orderStatusTransition.create({
      data: {
        fromStatus: t.from as import('@prisma/client').OrderStatus,
        toStatus: t.to as import('@prisma/client').OrderStatus,
        note: t.note,
      },
    });
  }

  for (const m of COURIER_STATUS_MAPPINGS) {
    await prisma.courierStatusMapping.create({ data: m });
  }

  const genreRecords = await Promise.all(GENRES.map((g) => prisma.genre.create({ data: g })));

  const adminId = randomUUID();
  await prisma.user.create({
    data: {
      id: adminId,
      name: 'BookVerse Admin',
      email: 'admin@bookverse.local',
      emailVerified: true,
      role: UserRole.ADMIN,
      displayName: 'Admin',
    },
  });

  const publisherUsers = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const id = randomUUID();
      const user = await prisma.user.create({
        data: {
          id,
          name: `Publisher ${i + 1}`,
          email: `publisher${i + 1}@bookverse.local`,
          emailVerified: true,
          role: UserRole.PUBLISHER,
        },
      });
      const profile = await prisma.publisherProfile.create({
        data: {
          userId: id,
          businessName: `Publisher House ${i + 1}`,
          slug: `publisher-${i + 1}`,
          verified: i < 3,
        },
      });
      return { user, profile };
    }),
  );

  const writerUsers = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const id = randomUUID();
      await prisma.user.create({
        data: {
          id,
          name: `Writer ${i + 1}`,
          email: `writer${i + 1}@bookverse.local`,
          emailVerified: true,
          role: UserRole.WRITER,
        },
      });
      const profile = await prisma.writerProfile.create({
        data: {
          userId: id,
          penName: `Pen Name ${i + 1}`,
          verified: i < 5,
        },
      });
      return profile;
    }),
  );

  const vendorUsers = await Promise.all(
    Array.from({ length: 3 }, async (_, i) => {
      const id = randomUUID();
      await prisma.user.create({
        data: {
          id,
          name: `Vendor ${i + 1}`,
          email: `vendor${i + 1}@bookverse.local`,
          emailVerified: true,
          role: UserRole.VENDOR,
        },
      });
      const profile = await prisma.vendorProfile.create({
        data: {
          userId: id,
          shopName: `Book Shop ${i + 1}`,
          slug: `vendor-${i + 1}`,
          verified: true,
        },
      });
      return { id, profile };
    }),
  );

  const regularUsers = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      const id = randomUUID();
      return prisma.user.create({
        data: {
          id,
          name: `Reader ${i + 1}`,
          email: `reader${i + 1}@bookverse.local`,
          emailVerified: i % 3 === 0,
          role: UserRole.USER,
          phone: i < 20 ? `0170000${String(i).padStart(4, '0')}` : undefined,
          phoneVerified: i === 0,
          trustScore: 100,
        },
      });
    }),
  );

  await prisma.address.create({
    data: {
      userId: regularUsers[0].id,
      label: 'Home',
      phone: '01700000000',
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Dhanmondi',
      line1: 'House 12, Road 5',
      isDefault: true,
    },
  });

  const books = [];
  for (let i = 0; i < 200; i++) {
    const titleBn = `${BANGLA_TITLES[i % BANGLA_TITLES.length]} ${i + 1}`;
    const titleEn = `${ENGLISH_TITLES[i % ENGLISH_TITLES.length]} ${i + 1}`;
    const author = AUTHORS[i % AUTHORS.length];
    const genre = genreRecords[i % genreRecords.length];
    const publisher = publisherUsers[i % publisherUsers.length].profile;
    const writer = writerUsers[i % writerUsers.length];

    const book = await prisma.book.create({
      data: {
        slug: slugify(`book-${i + 1}-${titleEn}`),
        isbn: i % 5 === 0 ? `978-${String(1000000000 + i)}` : null,
        title: titleEn,
        titleBn,
        author: author.en,
        authorBn: author.bn,
        description: `English description for ${titleEn}. A Fresh & Human reader pick.`,
        descriptionBn: `${titleBn} — বাংলা বিবরণ। পাঠকদের জন্য তাজা সুপারিশ।`,
        genreId: genre.id,
        publisherId: publisher.id,
        writerId: writer.id,
        moodTags: pickMoods(i),
        pageCount: 120 + (i % 280),
        publishedYear: 1990 + (i % 35),
        language: i % 4 === 0 ? 'en' : 'bn',
      },
    });
    books.push(book);

    const seller =
      i % 7 === 0
        ? {
            sellerId: vendorUsers[i % vendorUsers.length].id,
            sellerType: SellerType.VENDOR,
            vendorId: vendorUsers[i % vendorUsers.length].profile.id,
          }
        : {
            sellerId: publisherUsers[i % publisherUsers.length].user.id,
            sellerType: SellerType.PUBLISHER,
            vendorId: null,
          };

    await prisma.listing.create({
      data: {
        bookId: book.id,
        sellerId: seller.sellerId,
        sellerType: seller.sellerType,
        vendorId: seller.vendorId,
        price: priceBdt(i),
        stock: i === 199 ? 1 : 5 + (i % 40),
        status: 'ACTIVE',
      },
    });
  }

  const buyer = regularUsers[0];
  const buyerAddress = await prisma.address.findFirst({ where: { userId: buyer.id } });
  const listing = await prisma.listing.findFirst({ where: { bookId: books[0].id } });
  if (listing && buyerAddress) {
    const linePaisa = toPaisa(listing.price.toString());
    const { sellerPaisa, commissionPaisa } = splitCommission(linePaisa, 800);
    const checkout = await prisma.checkout.create({
      data: {
        buyerId: buyer.id,
        paymentMethod: 'COD',
        status: 'COMPLETED',
        shippingAddressId: buyerAddress.id,
        idempotencyKey: `seed-order-${buyer.id}`,
      },
    });
    const order = await prisma.order.create({
      data: {
        checkoutId: checkout.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        paymentStatus: 'CAPTURED',
        subtotal: listing.price,
        shippingFee: '60.00',
        discount: '0.00',
        total: (Number(listing.price) + 60).toFixed(2),
        shippingAddressId: buyerAddress.id,
        lineItems: {
          create: {
            listingId: listing.id,
            bookId: books[0].id,
            titleSnap: books[0].title,
            unitPrice: listing.price,
            qty: 1,
            lineTotal: listing.price,
            sellerId: listing.sellerId,
            commissionBps: 800,
            commissionAmount: fromPaisa(commissionPaisa),
            sellerAmount: fromPaisa(sellerPaisa),
          },
        },
        statusHistory: {
          create: [
            { status: 'PENDING_PAYMENT', note: 'Seed' },
            { status: 'PROCESSING', note: 'COD' },
            { status: 'DELIVERED', note: 'Seed delivered order', actorId: adminId },
          ],
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      await createSaleLedgerForOrder(tx, order.id);
    });

    await prisma.review.create({
      data: {
        userId: buyer.id,
        bookId: books[0].id,
        rating: 5,
        body: 'Verified buyer review from seed — তাজা পড়ার অভিজ্ঞতা।',
        isVerifiedBuyer: true,
      },
    });

    await prisma.review.create({
      data: {
        userId: regularUsers[1].id,
        bookId: books[1].id,
        rating: 4,
        body: 'General review (not verified buyer).',
        isVerifiedBuyer: false,
      },
    });

    await prisma.claim.create({
      data: {
        orderId: order.id,
        reason: 'Sample claim for QA',
        images: ['local://claim/sample.jpg'],
        status: 'OPEN',
      },
    });
  }

  for (let i = 0; i < 15; i++) {
    const author = regularUsers[i + 2];
    await prisma.post.create({
      data: {
        authorId: author.id,
        type: i % 2 === 0 ? PostType.QUOTE : PostType.STATUS,
        body:
          i % 2 === 0
            ? `"${BANGLA_TITLES[i % BANGLA_TITLES.length]}" — আজকের পঙ্ক্তি`
            : `Reading update #${i + 1} — Fresh shelf vibes.`,
        bookId: books[i + 5].id,
        hasSpoiler: i % 5 === 0,
        likeCount: i * 2,
        commentCount: i,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'platform_ledger_user_id' },
    create: { key: 'platform_ledger_user_id', value: adminId, updatedBy: 'seed' },
    update: { value: adminId, updatedBy: 'seed' },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'SEED_COMPLETE',
      entity: 'System',
      entityId: 'bookverse',
      after: { books: 200, users: 50 + 5 + 10 + 3 + 1 },
    },
  });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
