// ============================================================================
// CoTEBek Demo Seeder — "Booth Es & Jajanan Kekinian"
// ============================================================================
// Generates ~1 month of realistic-looking business data (items, customers,
// team, orders spread across 30 days with mixed status/payment, and a
// handful of operational expense transactions) by calling the REAL CoTEBek
// API — so every number (doc numbers, ledger, reports) comes out consistent,
// exactly like real usage would produce.
//
// HOW TO RUN:
//   1. Fill in BASE_URL and JWT_TOKEN below.
//      - BASE_URL: your CoTEBek API base, e.g. https://cotebekapi.xxx.my.id/cteapi/v1
//      - JWT_TOKEN: open the Next.js app in your browser, log in, then check
//        DevTools > Application > Cookies > "cotebek_session" and paste its
//        value here. It's only used locally by this script, never sent anywhere else.
//   2. node seed-demo-booth.mjs
//   3. Takes a few minutes (runs sequentially, small delay between calls so
//      it doesn't hammer your server). Watch the console for progress.
// ============================================================================

const BASE_URL = 'http://localhost:3099/cteapi/v1';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGY4ZjUxYy0xMDU1LTRmMDQtOTU0ZC1mODMzZWYzZWQ4ODUiLCJlbWFpbCI6InJpeml5YW4uc2FrdTFAZ21haWwuY29tIiwiaWF0IjoxNzgzODI0MjkyLCJleHAiOjE3ODM4MjUxOTJ9.Xgd2FJmtdSWMaOYa87UPlGg_sh-N6wMHs7KWj7lKJRE';
const APP_NAME = 'Booth Es & Jajanan Kekinian';
const DAYS_OF_HISTORY = 30;

if (BASE_URL.includes('PASTE_') || JWT_TOKEN.includes('PASTE_')) {
  console.error('❌ Edit BASE_URL and JWT_TOKEN at the top of this file first.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const chance = (pct) => Math.random() * 100 < pct;

let API_KEY = null; // set after app creation

async function call(path, { method = 'GET', body, useApiKey = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
  if (useApiKey && API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json.message ?? 'Unknown error'}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Demo catalog
// ---------------------------------------------------------------------------

const MENU = [
  { name: 'Es Teh Manis', price: 5000, cogs: 1500, category: 'Minuman' },
  { name: 'Es Teh Tawar', price: 4000, cogs: 1000, category: 'Minuman' },
  { name: 'Es Jeruk', price: 6000, cogs: 2500, category: 'Minuman' },
  { name: 'Es Kopi Susu', price: 9000, cogs: 3500, category: 'Minuman' },
  { name: 'Cendol', price: 8000, cogs: 3000, category: 'Minuman' },
  { name: 'Es Cincau', price: 6000, cogs: 2000, category: 'Minuman' },
  { name: 'Cireng', price: 5000, cogs: 1800, category: 'Jajanan' },
  { name: 'Risoles', price: 4000, cogs: 1500, category: 'Jajanan' },
  { name: 'Pisang Goreng', price: 5000, cogs: 2000, category: 'Jajanan' },
  { name: 'Combro', price: 4000, cogs: 1500, category: 'Jajanan' },
];

const CUSTOMERS = [
  { name: 'Rina', phone: '081234567801' },
  { name: 'Dedi', phone: '081234567802' },
  { name: 'Siti Aminah', phone: null }, // langganan tanpa HP
  { name: 'Agus', phone: '081234567804' },
  { name: 'Wulan', phone: '081234567805' },
  { name: 'Pak Karto', phone: null },
  { name: 'Mira', phone: '081234567807' },
  { name: 'Yoga', phone: '081234567808' },
];

const TEAM = [
  { name: 'Bu Endang (Penjaga Booth)', phone: '081234567900' },
];

const PAYMENT_METHODS = ['Tunai', 'Tunai', 'Tunai', 'QRIS']; // tunai lebih sering, khas jajanan pinggir jalan

const EXPENSES = [
  { desc: 'Beli es batu', category: 'EXPENSE', min: 15000, max: 30000 },
  { desc: 'Beli gula pasir', category: 'EXPENSE', min: 20000, max: 40000 },
  { desc: 'Beli gas LPG 3kg', category: 'EXPENSE', min: 22000, max: 25000 },
  { desc: 'Beli minyak goreng', category: 'EXPENSE', min: 25000, max: 45000 },
  { desc: 'Sewa tempat harian', category: 'EXPENSE', min: 15000, max: 15000 },
  { desc: 'Beli galon air', category: 'EXPENSE', min: 6000, max: 6000 },
];

// ---------------------------------------------------------------------------
// Seeding steps
// ---------------------------------------------------------------------------

function isoAt(daysAgo, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log(`🚀 Creating app "${APP_NAME}"...`);
  const app = await call('/apps', { method: 'POST', body: { name: APP_NAME }, useApiKey: false });
  API_KEY = app.apiKey;
  console.log(`✅ App created. id=${app.id}`);
  console.log(`   apiKey=${API_KEY}  (save this if you want to switch env to it later)`);

  console.log('🚀 Seeding menu items...');
  const items = [];
  for (const m of MENU) {
    const item = await call('/items', { method: 'POST', body: m });
    items.push(item);
    await sleep(50);
  }
  console.log(`✅ ${items.length} items created.`);

  console.log('🚀 Seeding customers...');
  const customers = [];
  for (const c of CUSTOMERS) {
    const cust = await call('/customers', { method: 'POST', body: { name: c.name, phone: c.phone ?? undefined } });
    customers.push(cust);
    await sleep(50);
  }
  console.log(`✅ ${customers.length} customers created.`);

  console.log('🚀 Seeding team member...');
  for (const t of TEAM) {
    await call('/team-members', { method: 'POST', body: t });
    await sleep(50);
  }
  console.log(`✅ Team seeded.`);

  console.log(`🚀 Seeding ${DAYS_OF_HISTORY} days of orders...`);
  let orderCount = 0;

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const ordersToday = rand(3, 7);

    for (let i = 0; i < ordersToday; i++) {
      const hour = rand(9, 20);
      const minute = rand(0, 59);
      const orderDate = isoAt(daysAgo, hour, minute);

      const itemCount = rand(1, 3);
      const chosenItems = [];
      for (let j = 0; j < itemCount; j++) chosenItems.push(pick(MENU));

      const cartItems = chosenItems.map((m) => {
        const qty = rand(1, 3);
        return {
          itemName: m.name,
          qty,
          price: m.price,
          cogs: m.cogs,
          subtotal: m.price * qty,
        };
      });

      const totalAmount = cartItems.reduce((s, i) => s + i.subtotal, 0);
      const totalCogs = cartItems.reduce((s, i) => s + i.cogs * i.qty, 0);
      const useCustomer = chance(60);
      const customer = useCustomer ? pick(customers) : null;
      const isUnpaid = chance(10);
      const isCancelled = chance(5);

      let order;
      try {
        order = await call('/orders', {
          method: 'POST',
          body: {
            customerId: customer?.id,
            items: cartItems,
            totalAmount,
            totalCogs,
            paymentMethod: pick(PAYMENT_METHODS),
            paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
            orderDate,
          },
        });
      } catch (e) {
        console.warn(`   ⚠️ skip 1 order (${e.message})`);
        continue;
      }

      orderCount++;

      // Advance order status. Older orders -> fully DONE (completed history).
      // Recent orders (last 2 days) -> mixed stages, feels "in progress".
      const orderId = order.id;
      try {
        if (isCancelled) {
          await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } });
        } else if (daysAgo > 2) {
          await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'IN_PROCESS' } });
          await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'READY' } });
          await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'DONE' } });
        } else if (chance(50)) {
          await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'IN_PROCESS' } });
          if (chance(50)) await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'READY' } });
        }
      } catch (e) {
        console.warn(`   ⚠️ status transition skipped for one order (${e.message})`);
      }

      await sleep(40);
    }

    if (daysAgo % 5 === 0) console.log(`   ...sampai H-${daysAgo} (${orderCount} order so far)`);
  }

  console.log(`✅ ${orderCount} orders seeded.`);

  console.log('🚀 Seeding operational expenses...');
  let expenseCount = 0;
  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo -= rand(2, 4)) {
    const exp = pick(EXPENSES);
    const amount = rand(exp.min, exp.max);
    const isUnpaid = chance(15);

    try {
      await call('/transactions', {
        method: 'POST',
        body: {
          type: 'OUT',
          category: exp.category,
          amount,
          paymentMethod: 'Tunai',
          description: exp.desc,
          transactionDate: isoAt(daysAgo, rand(7, 9), rand(0, 59)),
          paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
          dueDate: isUnpaid ? isoAt(daysAgo - 7, 12, 0) : undefined,
        },
      });
      expenseCount++;
    } catch (e) {
      console.warn(`   ⚠️ skip 1 expense (${e.message})`);
    }
    await sleep(50);
  }
  console.log(`✅ ${expenseCount} expense transactions seeded.`);

  console.log('\n🎉 Done! Switch COTEBEK_API_KEY in your Next.js env to:');
  console.log(`   ${API_KEY}`);
  console.log('   ...then restart the frontend to browse the demo data.');
}

main().catch((e) => {
  console.error('\n❌ Seeding failed:', e.message);
  process.exit(1);
});
