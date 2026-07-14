// cotebek/seeds/seed-demo-dapur-rumahan.mjs
// ============================================================================
// CoTEBek Demo Seeder — "Dapur Bunda Kirana" (UMKM rumahan)
// ============================================================================
// Beda dari 2 seeder sebelumnya: traffic-nya sengaja TIDAK rata. Sebagian
// hari "tutup" total (0 order), volume harian bursty (kebanyakan sepi,
// sesekali rame mendadak), dan 2 item beneran di-nonaktifin sementara
// (pakai endpoint toggle isActive yang asli) buat simulasi "lagi kehabisan
// stok" — bukan cuma dirandom di angka, tapi kejadian beneran di sistem.
//
// HOW TO RUN: sama seperti 2 seeder sebelumnya — isi BASE_URL & JWT_TOKEN,
// lalu `node seed-demo-dapur-rumahan.mjs`. Lebih ringan dari toko kelontong
// (order lebih sedikit), harusnya beberapa menit saja.
// ============================================================================

const BASE_URL = 'http://localhost:3099/cteapi/v1';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ODhjZjZjZS1jNTE4LTQyZTktYTAxMS02NWMzMWQwODZiY2EiLCJlbWFpbCI6ImFrdWdhbGF1LjIwMThAZ21haWwuY29tIiwiaWF0IjoxNzgzODczODk0LCJleHAiOjE3ODM4NzQ3OTR9.vhFP8_Mer66gMRxTgX_WRaTIfVY--Eq4efkTyUdIiAU';
const APP_NAME = 'Dapur Bunda Kirana';
const DAYS_OF_HISTORY = 30;

if (BASE_URL.includes('PASTE_') || JWT_TOKEN.includes('PASTE_')) {
  console.error('❌ Edit BASE_URL and JWT_TOKEN at the top of this file first.');
  process.exit(1);
}

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
  { name: 'Nastar (toples)', price: 45000, cogs: 32000, category: 'Kue Kering' },
  { name: 'Kastengel (toples)', price: 48000, cogs: 34000, category: 'Kue Kering' },
  { name: 'Putri Salju (toples)', price: 42000, cogs: 30000, category: 'Kue Kering' },
  { name: 'Brownies Kukus', price: 35000, cogs: 22000, category: 'Kue Basah' },
  { name: 'Risol Mayo (isi 10)', price: 30000, cogs: 18000, category: 'Snack Box' },
  { name: 'Pastel Sayur (isi 10)', price: 28000, cogs: 16000, category: 'Snack Box' },
  { name: 'Klepon (box)', price: 20000, cogs: 12000, category: 'Kue Basah' },
  { name: 'Snack Box Meeting', price: 15000, cogs: 9000, category: 'Snack Box' },
];

// 2 item ini bakal dinonaktifin sementara (simulasi kehabisan stok)
const STOCKOUT_ITEM_NAMES = ['Brownies Kukus', 'Nastar (toples)'];

const CUSTOMERS = [
  { name: 'Mbak Fira', phone: '085711110001' },
  { name: 'Ibu Ratna', phone: '085711110002' },
  { name: 'Tetangga Blok D', phone: null },
  { name: 'Kantor Pak Bayu', phone: '085711110004' },
  { name: 'Mbak Wulan', phone: '085711110005' },
  { name: 'Bu RT', phone: null },
];

const PAYMENT_METHODS = ['Transfer Bank', 'QRIS', 'Transfer Bank', 'Tunai'];

const EXPENSES = [
  { desc: 'Beli tepung terigu', category: 'EXPENSE', min: 25000, max: 45000 },
  { desc: 'Beli mentega & margarin', category: 'EXPENSE', min: 30000, max: 60000 },
  { desc: 'Beli gula & telur', category: 'EXPENSE', min: 35000, max: 55000 },
  { desc: 'Beli kemasan/toples', category: 'EXPENSE', min: 20000, max: 40000 },
  { desc: 'Beli gas LPG', category: 'EXPENSE', min: 22000, max: 25000 },
  { desc: 'Ongkir ambil bahan baku', category: 'EXPENSE', min: 10000, max: 20000 },
];

// ---------------------------------------------------------------------------

function isoAt(daysAgo, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Bursty: kebanyakan hari sepi, sesekali rame mendadak, ada hari yang 0 sama sekali.
function ordersForDay() {
  if (chance(22)) return 0; // "tutup" / gak sempet posting hari ini
  const r = Math.random();
  if (r < 0.12) return rand(6, 12); // lagi viral/rame pesanan borongan
  if (r < 0.45) return rand(2, 4); // hari lumayan
  return rand(1, 1); // hari sepi, cuma 1 pesanan (kalau ada)
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
  const items = [];
  for (const m of MENU) {
    const item = await call('/items', { method: 'POST', body: m });
    items.push(item);
    await sleep(40);
  }
  console.log(`✅ ${items.length} items created.`);

  console.log('🚀 Seeding customers...');
  const customers = [];
  for (const c of CUSTOMERS) {
    const cust = await call('/customers', { method: 'POST', body: { name: c.name, phone: c.phone ?? undefined } });
    customers.push(cust);
    await sleep(40);
  }
  console.log(`✅ ${customers.length} customers created.`);

  // Jadwalin 2 window "kehabisan stok" acak sepanjang bulan (3-6 hari tiap window)
  const stockoutItems = items.filter((i) => STOCKOUT_ITEM_NAMES.includes(i.name));
  const stockoutWindows = stockoutItems.map((item) => {
    const windowLen = rand(3, 6);
    const startDaysAgo = rand(windowLen + 2, DAYS_OF_HISTORY - 2);
    return { item, offAt: startDaysAgo, onAt: startDaysAgo - windowLen };
  });

  console.log(`🚀 Seeding ${DAYS_OF_HISTORY} days of orders (traffic acak, ada hari tutup)...`);
  let orderCount = 0;
  let closedDays = 0;
  let activeItemNames = items.map((i) => i.name);

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    // Cek jadwal stockout hari ini
    for (const w of stockoutWindows) {
      if (daysAgo === w.offAt) {
        await call(`/items/${w.item.id}`, { method: 'PUT', body: { isActive: false } });
        activeItemNames = activeItemNames.filter((n) => n !== w.item.name);
        console.log(`   📦 "${w.item.name}" kehabisan stok (H-${daysAgo})`);
      }
      if (daysAgo === w.onAt) {
        await call(`/items/${w.item.id}`, { method: 'PUT', body: { isActive: true } });
        activeItemNames.push(w.item.name);
        console.log(`   📦 "${w.item.name}" stok tersedia lagi (H-${daysAgo})`);
      }
    }

    const ordersToday = ordersForDay();
    if (ordersToday === 0) {
      closedDays++;
      continue;
    }

    const availableMenu = items.filter((i) => activeItemNames.includes(i.name));

    for (let i = 0; i < ordersToday; i++) {
      const hour = rand(9, 21);
      const minute = rand(0, 59);
      const orderDate = isoAt(daysAgo, hour, minute);

      const itemCount = rand(1, 2);
      const cartItems = [];
      for (let j = 0; j < itemCount; j++) {
        const m = pick(availableMenu);
        const qty = rand(1, 2);
        cartItems.push({ itemName: m.name, qty, price: m.price, cogs: m.cogs, subtotal: m.price * qty });
      }

      const totalAmount = cartItems.reduce((s, i) => s + i.subtotal, 0);
      const totalCogs = cartItems.reduce((s, i) => s + i.cogs * i.qty, 0);
      const isUnpaid = chance(8);
      const customer = chance(70) ? pick(customers) : null; // kebanyakan langganan yang balik lagi
      const isCancelled = chance(4);

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

      try {
        if (isCancelled) {
          await call(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'CANCELLED' } });
        } else {
          await advanceToDone(order.id);
        }
      } catch (e) {
        console.warn(`   ⚠️ status transition skipped for one order (${e.message})`);
      }

      await sleep(40);
    }
  }

  console.log(`✅ ${orderCount} orders seeded across ${DAYS_OF_HISTORY - closedDays} active days (${closedDays} hari tutup).`);

  console.log('🚀 Seeding bahan baku & operational expenses...');
  let expenseCount = 0;
  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo -= rand(3, 6)) {
    const exp = pick(EXPENSES);
    const amount = rand(exp.min, exp.max);

    try {
      await call('/transactions', {
        method: 'POST',
        body: {
          type: 'OUT',
          category: exp.category,
          amount,
          paymentMethod: 'Tunai',
          description: exp.desc,
          transactionDate: isoAt(daysAgo, rand(8, 10), rand(0, 59)),
        },
      });
      expenseCount++;
    } catch (e) {
      console.warn(`   ⚠️ skip 1 expense (${e.message})`);
    }
    await sleep(40);
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
