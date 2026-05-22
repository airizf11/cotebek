// cotebek/src/app-settings/app-settings.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { BulkUpsertSettingsDto } from './dto/bulk-upsert-settings.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';

@Injectable()
export class AppSettingsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  // Get all settings for an app — returns as flat key-value object
  async findAll(appId: string) {
    const rows = await this.db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.appId, appId));

    // Convert array → { key: value } map untuk easy consumption di frontend
    const settingsMap = rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return {
      message: 'App settings successfully retrieved.',
      data: settingsMap,
    };
  }

  // Get single setting by key
  async findOne(appId: string, key: string) {
    const row = await this.db
      .select()
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          eq(schema.appSettings.key, key),
        ),
      )
      .limit(1);

    if (!row[0]) throw new NotFoundException(`Setting '${key}' not found.`);

    return {
      message: 'Setting successfully retrieved.',
      data: { key: row[0].key, value: row[0].value },
    };
  }

  // Upsert single setting
  async upsert(
    appId: string,
    dto: UpsertSettingDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const existing = await this.db
      .select()
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          eq(schema.appSettings.key, dto.key),
        ),
      )
      .limit(1);

    // ← TAMBAH: simpan before jika update, null jika insert baru
    const beforeValue = existing[0]
      ? { key: existing[0].key, value: existing[0].value }
      : null;

    if (existing[0]) {
      await this.db
        .update(schema.appSettings)
        .set({ value: dto.value })
        .where(
          and(
            eq(schema.appSettings.appId, appId),
            eq(schema.appSettings.key, dto.key),
          ),
        );
    } else {
      await this.db.insert(schema.appSettings).values({
        appId,
        key: dto.key,
        value: dto.value,
      });
    }

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_APP_SETTINGS,
      entity: 'appSettings',
      entityId: null,
      before: beforeValue,
      after: { key: dto.key, value: dto.value },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: `Setting '${dto.key}' successfully saved.`,
      data: { key: dto.key, value: dto.value },
    };
  }

  // Bulk upsert — untuk initial setup saat buat usaha baru
  async bulkUpsert(
    appId: string,
    dto: BulkUpsertSettingsDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    // 1. Ambil values sebelum upsert untuk audit (1 query, bukan N)
    const existingKeys = dto.settings.map((s) => s.key);
    const beforeRows = await this.db
      .select({ key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          inArray(schema.appSettings.key, existingKeys),
        ),
      );

    const beforeMap = Object.fromEntries(
      beforeRows.map((r) => [r.key, r.value]),
    );

    // 2. Satu upsert sekaligus (1 query)
    await this.db
      .insert(schema.appSettings)
      .values(
        dto.settings.map((s) => ({
          appId,
          key: s.key,
          value: s.value,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.appSettings.appId, schema.appSettings.key],
        set: { value: sql`excluded.value` },
      });

    // 3. Audit sekali (1 log entry, bukan N)
    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_APP_SETTINGS,
      entity: 'appSettings',
      entityId: null,
      before: beforeMap,
      after: Object.fromEntries(dto.settings.map((s) => [s.key, s.value])),
      ipAddress: ipAddress ?? null,
    });

    return {
      message: `${dto.settings.length} settings successfully saved.`,
      data: Object.fromEntries(dto.settings.map((s) => [s.key, s.value])),
    };
  }

  // Delete setting by key
  async remove(
    appId: string,
    key: string,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    // ← TAMBAH: ambil before sebelum dihapus
    const existing = await this.db
      .select()
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          eq(schema.appSettings.key, key),
        ),
      )
      .limit(1);

    if (!existing[0]) throw new NotFoundException(`Setting ${key} not found.`);

    await this.db
      .delete(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          eq(schema.appSettings.key, key),
        ),
      );

    // ← TAMBAH: before = value lama, after = null (hard delete!)
    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_APP_SETTINGS,
      entity: 'appSettings',
      entityId: null,
      before: { key: existing[0].key, value: existing[0].value },
      after: null,
      ipAddress: ipAddress ?? null,
    });

    return { message: `Setting '${key}' successfully deleted.` };
  }

  // Helper — dipakai service lain untuk baca config
  async getValue<T = unknown>(
    appId: string,
    key: string,
    defaultValue?: T,
  ): Promise<T> {
    const row = await this.db
      .select()
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.appId, appId),
          eq(schema.appSettings.key, key),
        ),
      )
      .limit(1);

    if (!row[0]) return defaultValue as T;
    return row[0].value as T;
  }
}
