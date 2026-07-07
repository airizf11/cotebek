// cotebek/src/common/utils/doc-number.util.ts
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq, and, sql } from 'drizzle-orm';

export type DocType = 'order' | 'transaction';

export async function generateDocNumber(
  db: NodePgDatabase<typeof schema>,
  appId: string,
  type: DocType,
): Promise<string> {
  const settingKey = type === 'order' ? 'order_prefix' : 'tx_prefix';
  const defaultPrefix = type === 'order' ? 'ORD' : 'TRX';

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

  const raw = setting[0]?.value;
  const prefix = raw ? String(raw).replace(/^"|"$/g, '') : defaultPrefix;

  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowWIB = new Date(Date.now() + WIB_OFFSET_MS);
  const ymd = nowWIB.toISOString().slice(0, 10).replace(/-/g, '');

  const [{ seq }] = await db
    .insert(schema.docCounters)
    .values({ appId, prefix, date: ymd, seq: 1 })
    .onConflictDoUpdate({
      target: [
        schema.docCounters.appId,
        schema.docCounters.prefix,
        schema.docCounters.date,
      ],
      set: { seq: sql`${schema.docCounters.seq} + 1` },
    })
    .returning({ seq: schema.docCounters.seq });

  return `${prefix}-${ymd}-${String(seq).padStart(4, '0')}`;
}
