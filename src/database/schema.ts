// cotebek/src/database/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  decimal,
  boolean,
  pgEnum,
  integer,
  primaryKey,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { AdapterAccount } from 'next-auth/adapters';

export const transactionTypeEnum = pgEnum('transaction_type', ['IN', 'OUT']);
export const txCategoryEnum = pgEnum('transaction_category', [
  'SALES',
  'EXPENSE',
  'FUND_IN',
  'FUND_OUT',
  'OTHER',
  'ADJUSTMENT',
  'CAPEX',
]);
export const itemTypeEnum = pgEnum('item_type', ['SERVICE', 'GOOD']);
export const appRoleEnum = pgEnum('user_role', [
  'DEV',
  'OWNER',
  'ADMIN',
  'STAFF',
  'USER',
]);
export const joinStatusEnum = pgEnum('join_status', [
  'PENDING',
  'ACTIVE',
  'REJECTED',
]);
export const auditActionEnum = pgEnum('audit_action', [
  // Orders
  'CREATE_ORDER',
  'UPDATE_ORDER_STATUS',
  'MARK_ORDER_PAID',
  // Items
  'CREATE_ITEM',
  'UPDATE_ITEM',
  'DELETE_ITEM',
  // Apps & Members
  'CREATE_APP',
  'REQUEST_JOIN',
  'APPROVE_MEMBER',
  'REMOVE_MEMBER',
  'INVITE_MEMBER',
  // Transactions
  'CREATE_TRANSACTION',
  // Customers
  'CREATE_CUSTOMER',
  'UPDATE_CUSTOMER',
  'DELETE_CUSTOMER',
  // Promos
  'CREATE_PROMO',
  'UPDATE_PROMO',
  'DELETE_PROMO',
  // App Settings
  'UPDATE_APP_SETTINGS',
  // Auth
  'USER_LOGIN',
]);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', // ← baru: belum dikonfirmasi / belum dibayar
  'RECEIVED',
  'IN_PROCESS',
  'READY',
  'DONE',
  'CANCELLED',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['PAID', 'UNPAID']);
export const promoTypeEnum = pgEnum('promo_type', ['PERCENTAGE', 'NOMINAL']);
export const promoScopeEnum = pgEnum('promo_scope', [
  'ALL',
  'SPECIFIC_ITEMS',
  'SPECIFIC_CUSTOMERS',
]);

export const users = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  password: text('password'),
  image: text('image'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable(
  'account',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const refreshTokens = pgTable('refresh_token', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  apiKey: varchar('api_key', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userApps = pgTable('user_apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  appId: uuid('app_id')
    .references(() => apps.id)
    .notNull(),
  role: appRoleEnum('role').default('USER').notNull(),
  status: joinStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appInvites = pgTable(
  'app_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appId: uuid('app_id')
      .references(() => apps.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: appRoleEnum('role').default('STAFF').notNull(),
    invitedBy: uuid('invited_by').references(() => users.id),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow(),
  },
  (table) => ({
    appEmailUnique: uniqueIndex('app_invites_app_email_unique').on(
      table.appId,
      table.email,
    ),
  }),
);

export const appSettings = pgTable(
  'app_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appId: uuid('app_id')
      .references(() => apps.id, { onDelete: 'cascade' })
      .notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    value: jsonb('value').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    appKeyUnique: uniqueIndex('app_settings_app_key_unique').on(
      table.appId,
      table.key,
    ), // ← ini target conflict-nya
  }),
);

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  cogs: decimal('cogs', { precision: 15, scale: 2 }).default('0'),
  category: text('category'),
  type: itemTypeEnum('type').default('SERVICE').notNull(),
  unit: varchar('unit', { length: 20 }),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const rawMaterials = pgTable('raw_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  unit: varchar('unit', { length: 20 }),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const txItems = pgTable('transactions_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  rawMaterialId: uuid('raw_material_id').references(() => rawMaterials.id),
  itemName: text('item_name').notNull(),
  qty: decimal('qty', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id)
    .notNull(),
  txNumber: varchar('tx_number', { length: 50 }),
  type: transactionTypeEnum('type').notNull(),
  category: txCategoryEnum('category').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  fee: decimal('fee', { precision: 15, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 100 }),
  paymentStatus: paymentStatusEnum('payment_status').default('PAID').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  description: varchar('description', { length: 255 }),
  referenceId: uuid('reference_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appId: uuid('app_id')
      .references(() => apps.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    loyaltyPoints: integer('loyalty_points').default(0).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: text('email'),
    gender: genderEnum('gender'),
    birthDate: timestamp('birth_date', { mode: 'date' }),
    addressDetail: text('address_detail'),
    village: varchar('village', { length: 100 }),
    district: varchar('district', { length: 100 }),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    notes: text('notes'),
    tags: jsonb('tags').$type<string[]>(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userAppUnique: uniqueIndex('customers_user_app_unique').on(
      table.appId,
      table.userId,
    ),
    appPhoneUnique: uniqueIndex('customers_app_phone_unique').on(
      table.appId,
      table.phone,
    ),
  }),
);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id)
    .notNull(),
  handledBy: uuid('handled_by').references(() => users.id),
  customerId: uuid('customer_id').references(() => customers.id),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  totalCogs: decimal('total_cogs', { precision: 15, scale: 2 }).default('0'),
  paymentMethod: varchar('payment_method', { length: 100 }),
  paymentStatus: paymentStatusEnum('payment_status').default('PAID').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
  status: orderStatusEnum('status').default('RECEIVED').notNull(),
  promoId: uuid('promo_id').references(() => promos.id), // nullable
  discountAmount: decimal('discount_amount', {
    precision: 15,
    scale: 2,
  }).default('0'),
  finalAmount: decimal('final_amount', { precision: 15, scale: 2 }), // nullable, diisi saat create
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .references(() => orders.id)
    .notNull(),
  itemId: uuid('item_id').references(() => items.id),
  itemName: text('item_name').notNull(),
  qty: decimal('qty', { precision: 10, scale: 2 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  cogs: decimal('cogs', { precision: 15, scale: 2 }).default('0'),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id), // nullable — ApiKey-only request tidak ada userId
  actorType: varchar('actor_type', { length: 10 })
    .$type<'HUMAN' | 'SYSTEM'>()
    .notNull()
    .default('SYSTEM'),
  action: auditActionEnum('action').notNull(),
  entity: varchar('entity', { length: 100 }).notNull(), // 'orders' | 'items' | 'userApps' | ...
  entityId: uuid('entity_id'), // id row yang terpengaruh
  before: jsonb('before'), // state sebelum (update/delete)
  after: jsonb('after'), // state sesudah
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 max 15, IPv6 max 45
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const promos = pgTable('promos', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  code: varchar('code', { length: 50 }), // nullable = promo tanpa kode (manual apply)
  type: promoTypeEnum('type').notNull(),
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  minOrder: decimal('min_order', { precision: 15, scale: 2 }),
  maxDiscount: decimal('max_discount', { precision: 15, scale: 2 }), // cap untuk PERCENTAGE
  scope: promoScopeEnum('scope').default('ALL').notNull(),
  itemIds: jsonb('item_ids').$type<string[]>(), // nullable
  customerIds: jsonb('customer_ids').$type<string[]>(), // nullable
  maxUsagePerCustomer: integer('max_usage_per_customer'), // null = no per-customer cap
  isActive: boolean('is_active').default(true).notNull(),
  startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
  endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
  usageLimit: integer('usage_limit'), // nullable = unlimited
  usageCount: integer('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const promoUsages = pgTable(
  'promo_usages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appId: uuid('app_id')
      .references(() => apps.id, { onDelete: 'cascade' })
      .notNull(),
    promoId: uuid('promo_id')
      .references(() => promos.id)
      .notNull(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    discountAmount: decimal('discount_amount', {
      precision: 15,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow(),
  },
  (table) => ({
    promoCustomerIdx: index('promo_usages_promo_customer_idx').on(
      table.promoId,
      table.customerId,
    ),
  }),
);

// 3. Tambah docCounters table — untuk sequential number per usaha per hari
export const docCounters = pgTable(
  'doc_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appId: uuid('app_id')
      .references(() => apps.id, { onDelete: 'cascade' })
      .notNull(),
    prefix: varchar('prefix', { length: 20 }).notNull(), // 'ORD', 'TX', dll
    date: varchar('date', { length: 10 }).notNull(), // '2026-04-26'
    seq: integer('seq').default(1).notNull(),
  },
  (t) => ({
    // Unique constraint: satu counter per (appId + prefix + date)
    uniqCounter: uniqueIndex('uniq_doc_counter').on(t.appId, t.prefix, t.date),
  }),
);
