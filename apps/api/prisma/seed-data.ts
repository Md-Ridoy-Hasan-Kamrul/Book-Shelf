/** Appendix C — SystemSetting defaults (local dev). */
export const SYSTEM_SETTINGS: Record<string, unknown> = {
  escrow_days: 7,
  claim_window_days: 3,
  cod_max_bdt: '5000.00',
  points_per_100_bdt: 1,
  min_order_bdt: '100.00',
  free_shipping_threshold_bdt: '999.00',
  max_cart_items: 20,
  point_redemption_cap_bps: 2000,
  review_min_chars: 20,
};

/** Appendix D — CommissionRule seed rows (bps). */
export const COMMISSION_RULES = [
  {
    name: 'Publisher direct',
    sellerType: 'PUBLISHER' as const,
    genreSlug: null,
    bps: 800,
    priority: 10,
  },
  {
    name: 'Writer storefront',
    sellerType: 'WRITER' as const,
    genreSlug: null,
    bps: 500,
    priority: 20,
  },
  {
    name: 'Vendor marketplace',
    sellerType: 'VENDOR' as const,
    genreSlug: null,
    bps: 1200,
    priority: 30,
  },
  {
    name: 'User resale (used)',
    sellerType: 'USER' as const,
    genreSlug: null,
    bps: 1500,
    priority: 40,
  },
  { name: 'Default fallback', sellerType: null, genreSlug: null, bps: 1000, priority: 100 },
];

export const GENRES = [
  { slug: 'fiction', name: 'Fiction', nameBn: 'উপন্যাস' },
  { slug: 'non-fiction', name: 'Non-fiction', nameBn: 'সাধারণ জ্ঞান' },
  { slug: 'poetry', name: 'Poetry', nameBn: 'কবিতা' },
  { slug: 'children', name: 'Children', nameBn: 'শিশু' },
  { slug: 'academic', name: 'Academic', nameBn: 'একাডেমিক' },
  { slug: 'biography', name: 'Biography', nameBn: 'জীবনী' },
  { slug: 'history', name: 'History', nameBn: 'ইতিহাস' },
  { slug: 'science', name: 'Science', nameBn: 'বিজ্ঞান' },
  { slug: 'religion', name: 'Religion', nameBn: 'ধর্ম' },
  { slug: 'business', name: 'Business', nameBn: 'ব্যবসা' },
  { slug: 'comics', name: 'Comics & Graphic', nameBn: 'কমিক্স' },
  { slug: 'self-help', name: 'Self-help', nameBn: 'আত্ম-উন্নয়ন' },
];

export const MOOD_TAGS = [
  'happy',
  'calm',
  'sad',
  'motivated',
  'curious',
  'romantic',
  'lonely',
  'stressed',
  'adventurous',
  'focused',
];

export const BANGLA_TITLES = [
  'পদ্মজা',
  'সূর্যের স্নান',
  'নদীর কিনারে',
  'হারিয়ে যাওয়া দিন',
  'চাঁদের গল্প',
  'বৃষ্টির সুর',
  'পাহাড়ের রহস্য',
  'মাটির গন্ধ',
  'আকাশের নীল',
  'পাখির ডাক',
];

export const ENGLISH_TITLES = [
  'River Notes',
  'City of Pages',
  'Monsoon Letters',
  'The Quiet Shelf',
  'Paper Lanterns',
  'Borderless Stories',
  'Ink and Rain',
  'Midnight Market',
  'Borrowed Time',
  'Garden of Words',
];

export const AUTHORS = [
  { en: 'Humayun Ahmed', bn: 'হুমায়ূন আহমেদ' },
  { en: 'Zafar Iqbal', bn: 'মুহম্মদ জাফর ইকবাল' },
  { en: 'Tahmima Anam', bn: 'তাহমিমা আনাম' },
  { en: 'Akhtaruzzaman Elias', bn: 'আখতারুজ্জামান ইলিয়াস' },
  { en: 'Selina Hossain', bn: 'সেলিনা হোসেন' },
];
