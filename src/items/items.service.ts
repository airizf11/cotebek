// cotebek/src/items/items.service.ts
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, count } from 'drizzle-orm';
import { AuditService } from '../common/services/audit.service'; // ✅
import { AUDIT_ACTIONS } from '../common/constants/app-roles.constant'; // ✅
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { paginate } from 'src/common/utils/paginate.util';

@Injectable()
export class ItemsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService, // ✅
  ) {}

  async create(appId: string, dto: CreateItemDto, userId?: string | null, ipAddress?: string | null) {
    const newItem = await this.db.insert(schema.items).values({
      appId,
      name: dto.name,
      sku: dto.sku,
      price: dto.price.toString(),
      cogs: (dto.cogs ?? 0).toString(),
      category: dto.category,
    }).returning();

    await this.auditService.log({ // ✅
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_ITEM,
      entity: 'items',
      entityId: newItem[0].id,
      after: { ...dto },
      ipAddress: ipAddress ?? null,
    });

    return { message: 'Item successfully added.', data: newItem[0] };
  }

  async findAll(appId: string, pagination: PaginationDto) { // ✅ tambah param
  const { page = 1, limit = 20, offset } = pagination;

  const [items, [{ total }]] = await Promise.all([
    this.db
      .select()
      .from(schema.items)
      .where(and(eq(schema.items.appId, appId), eq(schema.items.isActive, true)))
      .limit(limit)
      .offset(offset),

    this.db
      .select({ total: count() })
      .from(schema.items)
      .where(and(eq(schema.items.appId, appId), eq(schema.items.isActive, true))),
  ]);

  const formatted = items.map(item => ({
    ...item,
    price: Number(item.price),
    cogs: Number(item.cogs),
  }));

  return {
    message: 'Item list successfully retrieved.',
    ...paginate(formatted, Number(total), page, limit), // ✅ spread: data + meta
  };
}

  async findOne(appId: string, id: string) {
    const item = await this.db
      .select()
      .from(schema.items)
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId)))
      .limit(1);

    if (!item[0]) throw new NotFoundException('Item not found.');

    return {
      message: 'Item detail successfully retrieved.',
      data: { ...item[0], price: Number(item[0].price), cogs: Number(item[0].cogs) },
    };
  }

  async update(appId: string, id: string, dto: UpdateItemDto, userId?: string | null, ipAddress?: string | null) {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.price !== undefined) updateData.price = dto.price.toString();
    if (dto.cogs !== undefined) updateData.cogs = dto.cogs.toString();
    if (dto.category !== undefined) updateData.category = dto.category;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update.');
    }

    // ✅ capture before state for audit
    const before = await this.findOne(appId, id);

    const updatedItem = await this.db
      .update(schema.items)
      .set(updateData)
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId)))
      .returning();

    if (!updatedItem[0]) throw new NotFoundException('Item not found for update.');

    await this.auditService.log({ // ✅
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_ITEM,
      entity: 'items',
      entityId: id,
      before: before.data as Record<string, unknown>,
      after: { ...updatedItem[0], price: Number(updatedItem[0].price), cogs: Number(updatedItem[0].cogs) },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Item successfully updated.',
      data: { ...updatedItem[0], price: Number(updatedItem[0].price), cogs: Number(updatedItem[0].cogs) },
    };
  }

  async remove(appId: string, id: string, userId?: string | null, ipAddress?: string | null) {
    const before = await this.findOne(appId, id); // ✅ capture before state

    const deletedItem = await this.db
      .update(schema.items)
      .set({ isActive: false })
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId)))
      .returning();

    if (!deletedItem[0]) throw new NotFoundException('Item not found.');

    await this.auditService.log({ // ✅
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.DELETE_ITEM,
      entity: 'items',
      entityId: id,
      before: before.data as Record<string, unknown>,
      after: null,
      ipAddress: ipAddress ?? null,
    });

    return { message: 'Item successfully removed.' };
  }
}