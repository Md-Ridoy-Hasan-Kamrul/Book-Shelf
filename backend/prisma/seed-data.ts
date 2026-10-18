/** Appendix C — SystemSetting defaults (local dev). */
export const SYSTEM_SETTINGS: Record<string, unknown> = {
  escrow_days: 7,
  claim_window_days: 3,
  cod_max_bdt: '5000.00',
  points_per_100_bdt: 1,
  points_per_bdt: 10,
  points_first_review: 20,
  points_finish_book: 15,
  points_goal_complete: 50,
  points_helpful_vote: 2,
  points_helpful_daily_cap: 20,
  min_order_bdt: '100.00',
  free_shipping_threshold_bdt: '999.00',
  max_cart_items: 20,
  point_redemption_cap_bps: 1000,
  review_min_chars: 20,
  cod_trust_score_min: 50,
  cod_new_user_max_bdt: '2000.00',
  checkout_reservation_minutes: 15,
  payment_fee_bps: 150,
  payout_min_bdt: '500.00',
  claim_window_hours: 72,
  rto_cost_bdt: '80.00',
  margin_guard_min_bps: 500,
  recommend_weights: {
    genre: 3,
    author: 4,
    publisher: 2,
    wishlist: 3,
    purchase: 5,
    shelf: 4,
    follow: 2,
    popularity: 1.5,
    freshness: 1,
  },
};

export const DELIVERY_FEE_RULES = [
  { district: 'Dhaka', baseFee: '60.00', perItemFee: '15.00', perKgFee: '0.00' },
  { district: 'Chattogram', baseFee: '80.00', perItemFee: '20.00', perKgFee: '0.00' },
  { district: 'Default', baseFee: '120.00', perItemFee: '25.00', perKgFee: '5.00' },
];

export const SEED_COUPONS = [
  {
    code: 'WELCOME10',
    discountType: 'PERCENT' as const,
    value: '10.00',
    minSubtotal: '300.00',
    maxDiscount: '200.00',
  },
  {
    code: 'FLAT50',
    discountType: 'FIXED' as const,
    value: '50.00',
    minSubtotal: '500.00',
    maxDiscount: null,
  },
];

/** Allowed order status transitions (Appendix C). */
export const ORDER_STATUS_TRANSITIONS: Array<{ from: string; to: string; note?: string }> = [
  { from: 'PENDING_PAYMENT', to: 'PAID', note: 'Online payment captured' },
  { from: 'PENDING_PAYMENT', to: 'CANCELLED', note: 'Unpaid timeout or buyer cancel' },
  { from: 'PAID', to: 'PROCESSING', note: 'Seller accepted' },
  { from: 'PAID', to: 'CANCELLED', note: 'Refund before processing' },
  { from: 'PROCESSING', to: 'PACKED', note: 'Seller packed order' },
  { from: 'PROCESSING', to: 'CANCELLED', note: 'Cancel before ship' },
  { from: 'PACKED', to: 'SHIPPED', note: 'Courier consignment created' },
  { from: 'PACKED', to: 'CANCELLED', note: 'Cancel before handoff' },
  { from: 'SHIPPED', to: 'DELIVERED', note: 'Delivery confirmed' },
  { from: 'SHIPPED', to: 'CANCELLED', note: 'Return in transit (rare)' },
  { from: 'DELIVERED', to: 'REFUNDED', note: 'Post-delivery claim approved' },
  { from: 'PENDING_PAYMENT', to: 'PROCESSING', note: 'COD confirmed at checkout' },
  { from: 'DELIVERED', to: 'DISPUTED', note: 'Buyer claim opened' },
  { from: 'DISPUTED', to: 'REFUNDED', note: 'Claim approved' },
  { from: 'DISPUTED', to: 'DELIVERED', note: 'Claim rejected' },
];

/** Mock courier status → internal action (P8). */
export const COURIER_STATUS_MAPPINGS: Array<{
  provider: string;
  courierStatus: string;
  internalAction: string;
  note?: string;
}> = [
  {
    provider: 'mock',
    courierStatus: 'CREATED',
    internalAction: 'TRACKING_ONLY',
    note: 'Label created',
  },
  { provider: 'mock', courierStatus: 'IN_TRANSIT', internalAction: 'SHIPPED' },
  { provider: 'mock', courierStatus: 'DELIVERED', internalAction: 'DELIVERED' },
  { provider: 'mock', courierStatus: 'RETURNED', internalAction: 'RETURNED' },
  { provider: 'mock', courierStatus: 'COD_REMIT', internalAction: 'COD_REMIT' },
];

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
    bps: 1000,
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
