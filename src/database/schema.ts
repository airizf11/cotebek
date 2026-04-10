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
} from 'drizzle-orm/pg-core';
import type { AdapterAccount } from 'next-auth/adapters';

export const transactionTypeEnum = pgEnum('transaction_type', ['IN', 'OUT']);
export const txCategoryEnum = pgEnum('transaction_category', [
  'SALES',
  'EXPENSE',
  'FUND_IN',
  'FUND_OUT',
  'OTHER',
]);
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
  // Items
  'CREATE_ITEM',
  'UPDATE_ITEM',
  'DELETE_ITEM',
  // Apps & Members
  'CREATE_APP',
  'REQUEST_JOIN',
  'APPROVE_MEMBER',
  'REMOVE_MEMBER',
  // Transactions
  'CREATE_TRANSACTION',
]);

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);

export const orderStatusEnum = pgEnum('order_status', [
  'RECEIVED',
  'IN_PROCESS',
  'READY',
  'DONE',
]);

export const users = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
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

/*
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: varchar('image', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
  .defaultNow()
  .$onUpdate(() => new Date()),
});

export const accounts = pgTable('accounts', {
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    refresh_token: varchar('refresh_token', { length: 255 }),
    access_token: varchar('access_token', { length: 255 }),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: varchar('id_token', { length: 2048 }),
    session_state: varchar('session_state', { length: 255 }),
  },
  (account) => ({
    // Satu provider (misal google) dan ID account-nya jadi Primary Key gabungan
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
); */

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

export const appSettings = pgTable('app_settings', {
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
});

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
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
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
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id)
    .notNull(),
  type: transactionTypeEnum('type').notNull(),
  category: txCategoryEnum('category').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 100 }),
  description: varchar('description', { length: 255 }),
  referenceId: uuid('reference_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id')
    .references(() => apps.id)
    .notNull(),
  handledBy: uuid('handled_by').references(() => users.id),
  customerId: uuid('customer_id').references(() => customers.id), // ✅ new
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  totalCogs: decimal('total_cogs', { precision: 15, scale: 2 }).default('0'),
  paymentMethod: varchar('payment_method', { length: 100 }),
  status: varchar('status', { length: 100 }).default('RECEIVED'),
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
  appId: uuid('app_id')
    .references(() => apps.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => users.id), // nullable — ApiKey-only request tidak ada userId
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
