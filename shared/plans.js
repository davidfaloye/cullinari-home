// Single source of truth for plan pricing and limits.
// Imported by the API (to price payments and enforce limits) and by the website (to display them).
// All amounts are in naira. Paystack charges in kobo, so multiply by 100 when charging.

export const PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    for: 'One restaurant getting online',
    monthly: 28000,
    setup: 75000,
    limits: { ordersPerDay: 50, inventoryItems: 100, branches: 1 },
    rows: [
      ['Orders per day', '50'],
      ['Inventory items', '100'],
      ['Branches', '1'],
      ['App setup, one time', '₦75,000'],
    ],
    inc: ['Your own ordering app', 'Admin dashboard and analytics'],
    app: { customSplash: false, menuLayouts: ['list'], maxExtraOptions: 0, customDomain: false, customFeatures: false },
  },
  {
    code: 'growth',
    name: 'Growth',
    for: 'Busy restaurants, a few locations',
    monthly: 63000,
    setup: 200000,
    featured: true,
    limits: { ordersPerDay: 200, inventoryItems: 500, branches: 3 },
    rows: [
      ['Orders per day', '200'],
      ['Inventory items', '500'],
      ['Branches', '3'],
      ['App setup, one time', '₦200,000'],
    ],
    inc: ['Custom splash screen and menu layout', 'Extra app options'],
    app: { customSplash: true, menuLayouts: ['list', 'grid', 'featured'], maxExtraOptions: 3, customDomain: false, customFeatures: false },
  },
  {
    code: 'pro',
    name: 'Pro',
    for: 'Chains that need it built their way',
    monthly: 140000,
    setup: 390000,
    limits: { ordersPerDay: null, inventoryItems: null, branches: null },
    rows: [
      ['Orders per day', 'Unlimited'],
      ['Inventory items', 'Unlimited'],
      ['Branches', 'Many'],
      ['App setup, one time', '₦390,000'],
    ],
    inc: ['Custom features and your own domain', 'Priority support'],
    app: { customSplash: true, menuLayouts: ['list', 'grid', 'featured'], maxExtraOptions: null, customDomain: true, customFeatures: true },
  },
];

export const EXTRA_OPTIONS = [
  { code: 'promo_banner', label: 'Promo banner on the home screen' },
  { code: 'scheduled_orders', label: 'Scheduled orders (order now, collect later)' },
  { code: 'pickup_delivery', label: 'Pickup or delivery choice at checkout' },
  { code: 'order_notes', label: 'Notes to the kitchen on each order' },
  { code: 'loyalty', label: 'Repeat-customer rewards' },
];

export const MENU_LAYOUTS = [
  { code: 'list', label: 'List', hint: 'Dish names and prices in rows. Fast to scan.' },
  { code: 'grid', label: 'Grid', hint: 'Photo tiles, two per row.' },
  { code: 'featured', label: 'Featured', hint: 'One large dish at the top, then a list.' },
];

export function getPlan(code) {
  return PLANS.find((p) => p.code === code) || null;
}

// What the client pays at approval: the one-time setup plus the first month.
export function firstPayment(code) {
  const plan = getPlan(code);
  if (!plan) return null;
  return { setup: plan.setup, monthly: plan.monthly, total: plan.setup + plan.monthly };
}

// "50 orders per day, 100 inventory items, 1 branch"
export function describeLimits(plan) {
  return plan.rows
    .slice(0, 3)
    .map(([k, v], i) => {
      const value = i > 0 && !/^\d/.test(v) ? v.toLowerCase() : v; // "Unlimited orders, unlimited items"
      return `${value} ${v === '1' ? k.toLowerCase().replace(/es$|s$/, '') : k.toLowerCase()}`;
    })
    .join(', ');
}

export function formatNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}
