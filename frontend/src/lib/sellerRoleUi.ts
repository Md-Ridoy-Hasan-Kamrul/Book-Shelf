export type SellerRole = 'VENDOR' | 'PUBLISHER' | 'WRITER';

export type SellerTab = 'overview' | 'inventory' | 'orders' | 'earnings' | 'payouts' | 'claims';

export type SellerRoleUi = {
  heading: string;
  blurb: string;
  badge: string;
  badgeClass: string;
  inventoryLabel: string;
  ordersLabel: string;
  earningsLabel: string;
  tabs: { id: SellerTab; label: string }[];
  overview: {
    ordersTotal: number;
    ordersToPack: number;
    salesLast30DaysBdt: string;
    openClaims: number;
    balancePendingBdt: string;
    balanceAvailableBdt: string;
  };
  sampleListings: { title: string; price: string; stock: number }[];
  growthLink?: string;
};

/** Mock-first role skins: Vendor / Publisher / Writer are not the same product surface. */
export const SELLER_ROLE_UI: Record<SellerRole, SellerRoleUi> = {
  VENDOR: {
    heading: 'Vendor dashboard',
    blurb: 'Your shop: stock, pack queue, and payouts.',
    badge: 'Vendor',
    badgeClass: 'bg-brand-100 text-brand-700', // trust blue
    inventoryLabel: 'Shop stock',
    ordersLabel: 'To pack',
    earningsLabel: 'Shop earnings',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'inventory', label: 'Stock' },
      { id: 'orders', label: 'Pack queue' },
      { id: 'earnings', label: 'Earnings' },
      { id: 'payouts', label: 'Payouts' },
      { id: 'claims', label: 'Claims' },
    ],
    overview: {
      ordersTotal: 28,
      ordersToPack: 5,
      salesLast30DaysBdt: '18500.00',
      openClaims: 1,
      balancePendingBdt: '3200.00',
      balanceAvailableBdt: '9100.00',
    },
    sampleListings: [
      { title: 'Used: শেষের কবিতা', price: '220.00', stock: 3 },
      { title: 'New: DevOps Handbook (BN)', price: '650.00', stock: 12 },
      { title: 'Bundle: Exam prep set', price: '890.00', stock: 4 },
    ],
  },
  PUBLISHER: {
    heading: 'Publisher dashboard',
    blurb: 'House catalog, warehouse fulfilment, and commission.',
    badge: 'Publisher',
    badgeClass: 'bg-leaf-100 text-leaf-700', // growth green
    inventoryLabel: 'Catalog SKUs',
    ordersLabel: 'Warehouse orders',
    earningsLabel: 'House earnings',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'inventory', label: 'Catalog' },
      { id: 'orders', label: 'Orders' },
      { id: 'earnings', label: 'Revenue' },
      { id: 'payouts', label: 'Payouts' },
      { id: 'claims', label: 'Claims' },
    ],
    overview: {
      ordersTotal: 142,
      ordersToPack: 11,
      salesLast30DaysBdt: '245000.00',
      openClaims: 2,
      balancePendingBdt: '48000.00',
      balanceAvailableBdt: '112000.00',
    },
    sampleListings: [
      { title: 'শেষের কবিতা: hardback', price: '450.00', stock: 240 },
      { title: 'পদ্মানদীর মাঝি', price: '380.00', stock: 180 },
      { title: 'DevOps Handbook (BN)', price: '720.00', stock: 95 },
    ],
    growthLink: '/publisher/growth',
  },
  WRITER: {
    heading: 'Writer dashboard',
    blurb: 'Your titles, royalties, and reprint signals: not a shop floor.',
    badge: 'Writer',
    badgeClass: 'bg-brand-50 text-brand-700', // calm trust
    inventoryLabel: 'My titles',
    ordersLabel: 'Recent sales',
    earningsLabel: 'Royalties',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'inventory', label: 'My titles' },
      { id: 'orders', label: 'Sales' },
      { id: 'earnings', label: 'Royalties' },
      { id: 'claims', label: 'Disputes' },
    ],
    overview: {
      ordersTotal: 64,
      ordersToPack: 0,
      salesLast30DaysBdt: '9200.00',
      openClaims: 0,
      balancePendingBdt: '1400.00',
      balanceAvailableBdt: '5600.00',
    },
    sampleListings: [
      { title: 'আমার নতুন উপন্যাস', price: 'royalty 12%', stock: 0 },
      { title: 'কবিতা সংকলন', price: 'royalty 15%', stock: 0 },
    ],
  },
};

export function isSellerRole(role: string): role is SellerRole {
  return role === 'VENDOR' || role === 'PUBLISHER' || role === 'WRITER';
}
