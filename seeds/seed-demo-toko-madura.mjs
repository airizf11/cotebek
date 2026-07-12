// cotebek/seeds/seed-demo-toko-madura.mjs
// ============================================================================
// CoTEBek Demo Seeder — "Toko Sembako Madura Barokah"
// ============================================================================
// Richer demo than the booth one: promo usage, multiple shift staff, and
// much higher order/transaction volume, running since 1 May 2026 to today.
// Retail-style: orders go straight to DONE (no multi-day process like laundry).
//
// HOW TO RUN:
//   1. Fill in BASE_URL and JWT_TOKEN below (same as the booth seeder).
//   2. node seed-demo-toko-madura.mjs
//   3. This is a LOT more data than the booth demo — expect roughly
//      5-10 minutes depending on your server. Watch the console for progress.
// ============================================================================

const BASE_URL = 'http://localhost:3099/cteapi/v1';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTdmNTRiNi03NDBjLTQ3YjItOTRmOS02MjE1ZWRlMmEwNDMiLCJlbWFpbCI6InJpemtpZjk5Ym95QGdtYWlsLmNvbSIsImlhdCI6MTc4Mzg1MjM3NiwiZXhwIjoxNzgzODUzMjc2fQ.DuYfTUwOcZ9BlgXZyFw7eusDBWPIjQA52QK62FbPMlA';
const APP_NAME = 'Toko Sembako Madura Barokah';
const START_DATE = new Date('2026-05-01T00:00:00');

if (BASE_URL.includes('PASTE_') || JWT_TOKEN.includes('PASTE_')) {
  console.error('❌ Edit BASE_URL and JWT_TOKEN at the top of this file first.');
  process.exit(1);
}

const DAYS_OF_HISTORY = Math.floor((Date.now() - START_DATE.getTime()) / 86400000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const chance = (pct) => Math.random() * 100 < pct;

let API_KEY = null;

async function call(path, { method = 'GET', body, useApiKey = true } = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT_TOKEN}` };
  if (useApiKey && API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json.message ?? 'Unknown error'}`);
  return json.data;
}

// ---------------------------------------------------------------------------
// Demo catalog
// ---------------------------------------------------------------------------

const MENU = [
  { name: 'Beras Premium 5kg', price: 68000, cogs: 60000, category: 'Sembako' },
  { name: 'Minyak Goreng 1L', price: 18000, cogs: 15500, category: 'Sembako' },
  { name: 'Gula Pasir 1kg', price: 16000, cogs: 14000, category: 'Sembako' },
  { name: 'Telur Ayam 1kg', price: 28000, cogs: 25000, category: 'Sembako' },
  { name: 'Indomie Goreng', price: 3500, cogs: 2800, category: 'Instan' },
  { name: 'Kopi Sachet (renceng)', price: 12000, cogs: 9500, category: 'Minuman' },
  { name: 'Teh Celup (kotak)', price: 8000, cogs: 6000, category: 'Minuman' },
  { name: 'Sabun Mandi', price: 5000, cogs: 3500, category: 'Kebutuhan Harian' },
  { name: 'Deterjen Bubuk 800g', price: 15000, cogs: 12000, category: 'Kebutuhan Harian' },
  { name: 'Sabun Cuci Piring', price: 9000, cogs: 7000, category: 'Kebutuhan Harian' },
  { name: 'Air Mineral Galon', price: 20000, cogs: 16000, category: 'Minuman' },
  { name: 'Gas LPG 3kg', price: 23000, cogs: 21000, category: 'Sembako' },
  { name: 'Rokok', price: 30000, cogs: 27000, category: 'Lainnya' },
  { name: 'Susu Kental Manis', price: 11000, cogs: 9000, category: 'Sembako' },
];

const CUSTOMERS = [
  { name: 'Bu Marni', phone: '082211110001' },
  { name: 'Pak Joko', phone: '082211110002' },
  { name: 'Bu Sri', phone: null },
  { name: 'Warga Blok C3', phone: '082211110004' },
  { name: 'Pak Rahmat', phone: null },
  { name: 'Bu Tuti', phone: '082211110006' },
  { name: 'Anak Kos Deni', phone: '082211110007' },
  { name: 'Bu Yanti', phone: '082211110008' },
  { name: 'Pak Hasan', phone: null },
  { name: 'Bu Wati', phone: '082211110010' },
];

const TEAM = [
  { name: 'Pak Slamet (Shift Pagi)', phone: '082211119001' },
  { name: 'Bu Ida (Shift Siang)', phone: '082211119002' },
  { name: 'Mas Rudi (Shift Malam)', phone: '082211119003' },
];

const PAYMENT_METHODS = ['Tunai', 'Tunai', 'Tunai', 'Tunai', 'QRIS'];

const EXPENSES = [
  { desc: 'Restock beras', category: 'EXPENSE', min: 400000, max: 700000 },
  { desc: 'Restock minyak goreng', category: 'EXPENSE', min: 150000, max: 300000 },
  { desc: 'Restock mie instan (1 dus)', category: 'EXPENSE', min: 90000, max: 90000 },
  { desc: 'Restock rokok', category: 'EXPENSE', min: 200000, max: 400000 },
  { desc: 'Restock gas LPG', category: 'EXPENSE', min: 100000, max: 150000 },
  { desc: 'Bayar listrik toko', category: 'EXPENSE', min: 150000, max: 250000 },
  { desc: 'Bayar sewa toko bulanan', category: 'EXPENSE', min: 1000000, max: 1000000 },
];

// ---------------------------------------------------------------------------

function isoAt(daysAgo, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function advanceToDone(orderId) {
  await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'IN_PROCESS' } });
  await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'READY' } });
  await call(`/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'DONE' } });
}

async function main() {
  console.log(`🚀 Creating app "${APP_NAME}"...`);
  const app = await call('/apps', { method: 'POST', body: { name: APP_NAME }, useApiKey: false });
  API_KEY = app.apiKey;
  console.log(`✅ App created. id=${app.id}`);

  console.log('🚀 Seeding items...');
  for (const m of MENU) {
    await call('/items', { method: 'POST', body: m });
    await sleep(30);
  }
  console.log(`✅ ${MENU.length} items created.`);

  console.log('🚀 Seeding customers...');
  const customers = [];
  for (const c of CUSTOMERS) {
    const cust = await call('/customers', { method: 'POST', body: { name: c.name, phone: c.phone ?? undefined } });
    customers.push(cust);
    await sleep(30);
  }
  console.log(`✅ ${customers.length} customers created.`);

  console.log('🚀 Seeding team (3 shift)...');
  for (const t of TEAM) {
    await call('/team-members', { method: 'POST', body: t });
    await sleep(30);
  }
  console.log('✅ Team seeded.');

  console.log('🚀 Seeding promos...');
  const promo1 = await call('/promos', {
    method: 'POST',
    body: { name: 'Hemat Belanja 5%', code: 'HEMAT5', type: 'PERCENTAGE', value: 5, minOrder: 50000 },
  });
  const promo2 = await call('/promos', {
    method: 'POST',
    body: { name: 'Potongan Belanja', code: 'BELANJA10', type: 'NOMINAL', value: 2000, minOrder: 30000 },
  });
  const promos = [promo1, promo2];
  console.log(`✅ 2 promos created (${promo1.code}, ${promo2.code}).`);

  console.log(`🚀 Seeding ${DAYS_OF_HISTORY} days of orders (since ${START_DATE.toISOString().slice(0, 10)})...`);
  let orderCount = 0;
  let promoUsedCount = 0;

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const ordersToday = rand(5, 10);

    for (let i = 0; i < ordersToday; i++) {
      const hour = rand(6, 22); // toko buka lebih panjang
      const minute = rand(0, 59);
      const orderDate = isoAt(daysAgo, hour, minute);

      const itemCount = rand(1, 4);
      const cartItems = [];
      for (let j = 0; j < itemCount; j++) {
        const m = pick(MENU);
        const qty = rand(1, 3);
        cartItems.push({ itemName: m.name, qty, price: m.price, cogs: m.cogs, subtotal: m.price * qty });
      }

      const totalAmount = cartItems.reduce((s, i) => s + i.subtotal, 0);
      const totalCogs = cartItems.reduce((s, i) => s + i.cogs * i.qty, 0);

      const isUnpaid = chance(12); // kasbon lumrah di toko kelontong
      const useCustomer = isUnpaid || chance(40); // wajib ada customer kalau ngutang
      const customer = useCustomer ? pick(customers) : null;
      const isCancelled = chance(3);

      const usePromo = !isCancelled && totalAmount >= 50000 && chance(15);
      const promoCode = usePromo ? pick(promos).code : undefined;

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
            promoCode,
            orderDate,
          },
        });
      } catch (e) {
        console.warn(`   ⚠️ skip 1 order (${e.message})`);
        continue;
      }

      orderCount++;
      if (usePromo) promoUsedCount++;

      try {
        if (isCancelled) {
          await call(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } });
        } else {
          await advanceToDone(order.id);
        }
      } catch (e) {
        console.warn(`   ⚠️ status transition skipped for one order (${e.message})`);
      }

      await sleep(25);
    }

    if (daysAgo % 10 === 0) console.log(`   ...sampai H-${daysAgo} (${orderCount} order, ${promoUsedCount} pakai promo)`);
  }

  console.log(`✅ ${orderCount} orders seeded (${promoUsedCount} pakai promo).`);

  console.log('🚀 Seeding restock & operational expenses...');
  let expenseCount = 0;
  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo -= rand(1, 2)) {
    const exp = pick(EXPENSES);
    const amount = rand(exp.min, exp.max);
    const isUnpaid = chance(20);

    try {
      await call('/transactions', {
        method: 'POST',
        body: {
          type: 'OUT',
          category: exp.category,
          amount,
          paymentMethod: 'Tunai',
          description: exp.desc,
          transactionDate: isoAt(daysAgo, rand(7, 10), rand(0, 59)),
          paymentStatus: isUnpaid ? 'UNPAID' : 'PAID',
          dueDate: isUnpaid ? isoAt(Math.max(daysAgo - 7, 0), 12, 0) : undefined,
        },
      });
      expenseCount++;
    } catch (e) {
      console.warn(`   ⚠️ skip 1 expense (${e.message})`);
    }
    await sleep(30);
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
