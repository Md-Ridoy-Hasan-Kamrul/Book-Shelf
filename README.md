# BookVerse: প্রজেক্ট ওভারভিউ

## এটা কী

বাংলাদেশের জন্য বই কেনাবেচা ও সোশ্যাল রিডিং কমিউনিটি। Rokomari বই বিক্রিতে শক্তিশালী। BookVerse বই খোঁজা, বই নিয়ে কথা বলা, পুরোনো বই বিক্রি আর লেখক-পাঠকের সম্পর্কে জোর দিয়ে আলাদা হতে চায়। প্রথম বছরে Rokomari-কে হারানোর চেষ্টা নয়, ছোট একটি কমিউনিটি দাঁড় করানো লক্ষ্য।

## কারা ব্যবহার করবে

| রোল | কী করে |
| --- | --- |
| USER | বই কেনে, রিভিউ দেয়, ফিড ব্যবহার করে, পুরোনো বই বেচে |
| WRITER | পোস্ট করে, AMA করে, শুধু নিজের ফলোয়ারদের follow-back করে |
| PUBLISHER | বই তোলে, বিজ্ঞাপন দেয়, reprint demand দেখে |
| VENDOR | বইয়ের দোকান হিসেবে বিক্রি করে |
| ADMIN | অনুমোদন, কমিশন, dispute ও payout সামলায় |
| RIDER | নিজস্ব ডেলিভারি, এখন বন্ধ (flag OFF) |

## মূল ফিচার

- **কমার্স:** সার্চ (বাংলা-ইংরেজি), বইয়ের পেজ, "Look Inside", কার্ট, COD ও অনলাইন পেমেন্ট, ডেলিভারি ট্র্যাকিং।
- **কমিউনিটি:** ফিড, কমেন্ট, spoiler blur, verified-buyer রিভিউ, ফলো, book club।
- **রিডিং:** bookshelf, বার্ষিক লক্ষ্য, পয়েন্ট ও ব্যাজ।
- **পার্থক্য:** মেজাজ অনুযায়ী বই খোঁজা, ISBN স্ক্যান করে পুরোনো বই বিক্রি, publisher-এর sponsored post ও analytics, quote card, লেখকের লাইভ Q&A।

## কীভাবে বানানো হবে

| অংশ | টুল |
| --- | --- |
| Web | Astro + React + Tailwind + TypeScript, TanStack Query, Zustand |
| API | Node + Express + Zod |
| ডেটা | PostgreSQL + Prisma, Redis + BullMQ |
| Auth | Better Auth |

বাইরের সব সার্ভিস (পেমেন্ট, courier, ছবি, ইমেইল, SMS) একটি "provider"-এর পেছনে। এখন mock বা লোকাল চলে, পরে `.env` বদলালেই আসল সার্ভিস চালু হয়।

## টাকার নিয়ম (সবচেয়ে গুরুত্বপূর্ণ অংশ)

- ক্রেতার টাকা প্ল্যাটফর্মে আসে, সঙ্গে সঙ্গে seller-কে যায় না।
- ডেলিভারির পর ৪৮ ঘণ্টা claim করার সুযোগ। ৭ দিন পর seller-এর পাওনা "পেমেন্ট-যোগ্য" হয়। payout সাপ্তাহিক।
- সব হিসাব একটি অপরিবর্তনীয় ledger-এ। COD-র টাকা courier ফেরত দিলে তবেই লেখা হয়।
- কমিশন Standard ১০%। প্রথম ১০ জন Founding Publisher ৬ মাস ২–৪%।
- পয়েন্টও একই ledger-ধাঁচে (PointLedger)।

## ব্যবসায়িক বাস্তবতা

- ১৫ কোটি টাকা হলো GMV (মোট বিক্রি), আয় নয়।
- ১০ হাজার অ্যাক্টিভ ক্রেতা বছরে ৬টি অর্ডার করলে GMV প্রায় ৩.৯ কোটি। ১৫ কোটির জন্য ৩৮–৭৭ হাজার ক্রেতা লাগবে। তাই ১০ হাজার হলো লঞ্চ স্কেল, ১৫ কোটি ২য়–৩য় বছরের লক্ষ্য।
- সবচেয়ে বড় ঝুঁকি COD ফেরত (RTO) আর কম কমিশন। সেজন্য ফোন যাচাই, নতুন ইউজারে COD সীমা, আর কমিশনের "margin guard" ধরা আছে।

## এখন কী কী তৈরি আছে

- PDF (২২ পৃষ্ঠা): P1–P17 প্রম্পট, Prompt 0, নতুন "ফ্রেশ" রঙ, ৪টি Appendix।
- ফাইল: README.md, PROJECT_FLOW.md, AGENTS.md, docs/FUTURE_PLAN.md, আর তিনটি ফোল্ডারের README।
- Google doc: আগের বিস্তারিত পরিকল্পনা (কিছু অংশ পুরোনো, নিচে দেখুন)।

## পথ

| ধাপ | প্রম্পট | ফল |
| --- | --- | --- |
| A · Setup | P1–2 | প্রজেক্ট চলে, রঙ ও UI ঠিক |
| B · Data + Auth | P3–4 | ডাটাবেস, লগইন, follow নিয়ম |
| C · Commerce | P5–9 | বই থেকে ডেলিভারি ও payout পর্যন্ত MVP দোকান |
| D · Retention | P10–12 | রিভিউ, ফিড, shelf, পয়েন্ট |
| E · Differentiators | P13–16 | used-book, mood, publisher tools, events |
| F · Hardening | P17 | নিরাপত্তা, ব্যাকআপ, লোড টেস্ট |

## খরচ

লোকালে ০ টাকা। প্রথম আসল খরচ আসবে domain/hosting নিলে, আর COD ভেরিফিকেশনে SMS ধরলে। লাইভ পেমেন্টের আগে ট্রেড লাইসেন্স, ব্যাংক অ্যাকাউন্ট, হিসাবরক্ষক লাগবে, যেগুলো সফটওয়্যারের বাইরের খরচ।

## যা এখনো অসম্পূর্ণ বা যাচাই বাকি

- Google doc-এ এখনো পুরোনো ৮% হিসাব ও Cloudflare/Oracle হোস্টিংয়ের কথা আছে। PDF ও .md ফাইলই এখন চূড়ান্ত।
- SSLCommerz, Steadfast ও Pathao-র আসল API-র খুঁটিনাটি, ফ্রি টায়ারের সীমা আর প্রকাশকদের সাথে আসল কমিশন লঞ্চের আগে মিলিয়ে নিতে হবে।
- COD-র সময় প্রথমে নিজে ফোন করে কনফার্ম করতে হতে পারে, কারণ SMS পরে।

## এখন কী করবেন

AGENTS.md রিপোতে রেখে PDF-এর P1 দিয়ে শুরু করুন। প্রতিটি প্রম্পট শেষে তার ACCEPTANCE নিজে চালিয়ে মিলিয়ে নেবেন।

---

## কোড সেটআপ

দুটি আলাদা অংশ, প্রতিটির নিজস্ব `package.json`।

```text
/                     Web: Astro + React + Tailwind + TypeScript
├── src/
│   ├── pages/index.astro
│   ├── layouts/Layout.astro
│   ├── components/
│   │   ├── layout/       Navbar.jsx, Footer.astro
│   │   ├── sections/     Hero, Features, HowItWorks
│   │   └── islands/      BuyButton.jsx
│   └── styles/global.css
├── e2e/              Playwright browser tests
└── api/              API: Node + Express + Zod
    ├── src/
    │   ├── index.ts      server start
    │   ├── app.ts        Express app, CORS, JSON, 404, error handler
    │   ├── env.ts        Zod দিয়ে .env যাচাই
    │   └── routes/health.ts
    └── .env.example
```

Web-এ Astro স্ট্যাটিক HTML বানায়। ইন্টারঅ্যাক্টিভ অংশ React `.jsx` island, `client:load` দিয়ে:

```astro
---
import BuyButton from '../components/BuyButton.jsx';
---

<BuyButton id={product.id} client:load />
```

TanStack Query, Zustand, Prisma, Redis, BullMQ আর Better Auth এখনো ইনস্টল করা নেই। যে ধাপে লাগবে (B থেকে), সেখানে যোগ হবে।

## কমান্ড

| কমান্ড | কাজ |
| --- | --- |
| `npm install` | Web dependencies |
| `npm --prefix api install` | API dependencies |
| `npm run dev` | Web চালু, `localhost:4321` ব্রাউজারে খোলে |
| `npm run dev:api` | API চালু, `localhost:4000/health` |
| `npm run build` | Web স্ট্যাটিক build, `dist/` |
| `npm test` | Web Vitest |
| `npm run test:api` | API Vitest |
| `npm run test:e2e` | Playwright |

API চালানোর আগে `api/.env.example` কপি করে `api/.env` বানান।
