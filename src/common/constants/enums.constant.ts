// cotebek/src/common/constants/enums.constant.ts
export const APP_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  USER: 'USER',
  DEV: 'DEV',
} as const;

export const JOIN_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
} as const;

export const AUDIT_ACTIONS = {
  // Orders
  CREATE_ORDER: 'CREATE_ORDER',
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  // Items
  CREATE_ITEM: 'CREATE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  // Apps & Members
  CREATE_APP: 'CREATE_APP',
  REQUEST_JOIN: 'REQUEST_JOIN',
  APPROVE_MEMBER: 'APPROVE_MEMBER',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  // Transactions
  CREATE_TRANSACTION: 'CREATE_TRANSACTION',
  // Customers
  CREATE_CUSTOMER: 'CREATE_CUSTOMER',
  UPDATE_CUSTOMER: 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER: 'DELETE_CUSTOMER',
  // Promos
  CREATE_PROMO: 'CREATE_PROMO',
  UPDATE_PROMO: 'UPDATE_PROMO',
  DELETE_PROMO: 'DELETE_PROMO',
  // App Settings
  UPDATE_APP_SETTINGS: 'UPDATE_APP_SETTINGS',
  // Auth
  USER_LOGIN: 'USER_LOGIN',
} as const;

export enum OrderStatus {
  RECEIVED = 'RECEIVED',
  IN_PROCESS = 'IN_PROCESS',
  READY = 'READY',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum TransactionCategory {
  SALES = 'SALES',
  EXPENSE = 'EXPENSE',
  FUND_IN = 'FUND_IN',
  FUND_OUT = 'FUND_OUT',
  OTHER = 'OTHER',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum PromoType {
  PERCENTAGE = 'PERCENTAGE',
  NOMINAL = 'NOMINAL',
}

export enum PromoScope {
  ALL = 'ALL',
  SPECIFIC_ITEMS = 'SPECIFIC_ITEMS',
  SPECIFIC_CUSTOMERS = 'SPECIFIC_CUSTOMERS',
}

// Type helpers — bisa dipakai di service/guard lain
export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];
export type JoinStatus = (typeof JOIN_STATUS)[keyof typeof JOIN_STATUS];
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
