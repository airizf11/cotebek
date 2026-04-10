// cotebek/src/common/constants/settings.constant.ts
export const SETTINGS_KEYS = {
  // Business
  BUSINESS_TYPE: 'business_type',   // 'laundry' | 'fnb' | 'retail'
  BUSINESS_NAME: 'business_name',
  BUSINESS_ADDRESS: 'business_address',
  BUSINESS_PHONE: 'business_phone',
  BUSINESS_HOURS: 'business_hours', // { open: '08:00', close: '21:00' }

  // Finance
  CURRENCY: 'currency',             // 'IDR'
  TAX_RATE: 'tax_rate',             // 0.11
  TAX_ENABLED: 'tax_enabled',       // true | false

  // Localization
  TIMEZONE: 'timezone',             // 'Asia/Jakarta'

  // Laundry-specific
  DEFAULT_DUE_DAYS: 'default_due_days',   // 2 (hari)
  EXPRESS_DUE_HOURS: 'express_due_hours', // 6 (jam)
  MINIMUM_WEIGHT_KG: 'minimum_weight_kg', // 3
  WEIGHT_UNIT: 'weight_unit',             // 'kg'
} as const;

export type SettingsKey = typeof SETTINGS_KEYS[keyof typeof SETTINGS_KEYS];