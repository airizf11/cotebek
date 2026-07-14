// cotebek/src/raw-materials/raw-materials.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { and, eq } from 'drizzle-orm';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';

@Injectable()
export class RawMaterialsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  async create(
    appId: string,
    dto: CreateRawMaterialDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const created = await this.db
      .insert(schema.rawMaterials)
      .values({ appId, name: dto.name, unit: dto.unit, category: dto.category })
      .returning();

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_RAW_MATERIAL,
      entity: 'rawMaterials',
      entityId: created[0].id,
      after: { name: dto.name },
      ipAddress: ipAddress ?? null,
    });

    return { message: 'Raw material created.', data: created[0] };
  }

  async findAll(appId: string, includeInactive?: boolean) {
    const filters = [eq(schema.rawMaterials.appId, appId)];
    if (!includeInactive) filters.push(eq(schema.rawMaterials.isActive, true));

    const materials = await this.db
      .select()
      .from(schema.rawMaterials)
      .where(and(...filters));

    return { message: 'Raw materials retrieved.', data: materials };
  }

  async update(
    appId: string,
    id: string,
    dto: UpdateRawMaterialDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const existing = await this.db
      .select()
      .from(schema.rawMaterials)
      .where(
        and(
          eq(schema.rawMaterials.id, id),
          eq(schema.rawMaterials.appId, appId),
        ),
      )
      .limit(1);

    if (!existing[0]) throw new NotFoundException('Raw material not found.');

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.db
      .update(schema.rawMaterials)
      .set(updateData)
      .where(
        and(
          eq(schema.rawMaterials.id, id),
          eq(schema.rawMaterials.appId, appId),
        ),
      )
      .returning();

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_RAW_MATERIAL,
      entity: 'rawMaterials',
      entityId: id,
      after: updateData,
      ipAddress: ipAddress ?? null,
    });

    return { message: 'Raw material updated.', data: updated[0] };
  }
}
