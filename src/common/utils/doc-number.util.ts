// cotebek/src/common/utils/doc-number.util.ts
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, and, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export type DocType = 'order' | 'transaction';

/**
 * Generate document number: {PREFIX}-{YYYYMMDD}-{SEQ 4 digit}
 * Example: QINQ-20260424-0042
 *
 * Prefix diambil dari appSettings (key: order_prefix / tx_prefix).
 * Sequence = jumlah dokumen hari ini + 1 (per appId + date).
 */
export async function generateDocNumber(
  db: NodePgDatabase<typeof schema>,
  appId: string,
  type: DocType,
): Promise<string> {
  const settingKey = type === 'order' ? 'order_prefix' : 'tx_prefix';
  const defaultPrefix = type === 'order' ? 'ORD' : 'TRX';

  // 1. Ambil prefix dari appSettings
  const setting = await db
    .select({ value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(
      and(
        eq(schema.appSettings.appId, appId),
        eq(schema.appSettings.key, settingKey),
      ),
    )
    .limit(1);

  // const prefix = (setting[0]?.value as string) ?? defaultPrefix;

  // Strip JSON quotes jika Drizzle wrap as "ORD"
  const raw = setting[0]?.value;
  const prefix = raw ? String(raw).replace(/^"|"$/g, '') : defaultPrefix;

  // 2. Date string YYYYMMDD (UTC, bisa kamu sesuaikan ke WIB)
  const now = new Date();
  // const ymd = now.toISOString().slice(0, 10).replace(/-/g, ''); // "20260424"

  // Date string YYYYMMDD dalam WIB (UTC+7)
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowWIB = new Date(Date.now() + WIB_OFFSET_MS);
  const ymd = nowWIB.toISOString().slice(0, 10).replace(/-/g, '');

  // Rentang hari ini WIB dalam UTC (untuk query DB)
  const todayWIBStr = nowWIB.toISOString().slice(0, 10); // "2026-04-24"
  const todayStartUTC = new Date(`${todayWIBStr}T00:00:00.000Z`);
  todayStartUTC.setTime(todayStartUTC.getTime() - WIB_OFFSET_MS); // 17:00 UTC day before
  const todayEndUTC = new Date(
    todayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1,
  );

  // 3. Hitung dokumen hari ini untuk appId ini
  /* const todayStart = new Date(
    `${now.toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const todayEnd = new Date(`${now.toISOString().slice(0, 10)}T23:59:59.999Z`); */

  const targetTable = type === 'order' ? schema.orders : schema.transactions;

  const [{ total }] = await db
    .select({ total: count() })
    .from(targetTable)
    .where(
      and(
        eq((targetTable as any).appId, appId),
        sql`${(targetTable as any).createdAt} >= ${todayStartUTC}`,
        sql`${(targetTable as any).createdAt} <= ${todayEndUTC}`,
      ),
    );

  // 4. Sequence: total hari ini + 1, 4 digit
  const seq = String(Number(total) + 1).padStart(4, '0');

  return `${prefix}-${ymd}-${seq}`;
}
