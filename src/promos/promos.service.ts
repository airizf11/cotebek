// cotebek/src/promos/promos.service.ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { and, eq, count } from 'drizzle-orm';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { paginate } from 'src/common/utils/paginate.util';
import { PromoScope, PromoType } from 'src/common/constants/enums.constant';

@Injectable()
export class PromosService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // ─── Private: Hitung Diskon ────────────────────────────────────────
  calculateDiscount(
    type: PromoType,
    value: number,
    orderAmount: number,
    maxDiscount?: number | null,
  ): number {
    let discount = 0;

    if (type === PromoType.NOMINAL) {
      discount = Math.min(value, orderAmount); // tidak boleh lebih dari total order
    } else {
      discount = (orderAmount * value) / 100;
      if (maxDiscount) discount = Math.min(discount, maxDiscount);
    }

    return Math.round(discount); // bulatkan ke integer rupiah
  }

  // ─── Private: Validasi & Ambil Promo ──────────────────────────────
  async validateAndGetPromo(
    appId: string,
    code: string,
    orderAmount: number,
    customerId?: string | null,
    itemIds?: string[],
  ) {
    const now = new Date();

    const promo = await this.db
      .select()
      .from(schema.promos)
      .where(
        and(
          eq(schema.promos.appId, appId),
          eq(schema.promos.code, code),
          eq(schema.promos.isActive, true),
        ),
      )
      .limit(1);

    if (!promo[0])
      throw new NotFoundException('Promo code not found or inactive.');

    const p = promo[0];

    // Cek tanggal validitas
    if (p.startDate && now < p.startDate)
      throw new BadRequestException('Promo is not yet active.');
    if (p.endDate && now > p.endDate)
      throw new BadRequestException('Promo has expired.');

    // Cek usage limit
    if (p.usageLimit !== null && p.usageCount >= p.usageLimit)
      throw new BadRequestException('Promo usage limit has been reached.');

    // Cek minimum order
    if (p.minOrder && orderAmount < Number(p.minOrder))
      throw new BadRequestException(
        `Minimum order amount for this promo is Rp${Number(p.minOrder).toLocaleString('id-ID')}.`,
      );

    // Cek scope
    if (p.scope === PromoScope.SPECIFIC_CUSTOMERS) {
      if (!customerId || !(p.customerIds as string[])?.includes(customerId))
        throw new BadRequestException(
          'This promo is not valid for this customer.',
        );
    }

    if (p.scope === PromoScope.SPECIFIC_ITEMS) {
      const promoItemIds = p.itemIds as string[];
      const hasMatch = itemIds?.some((id) => promoItemIds?.includes(id));
      if (!hasMatch)
        throw new BadRequestException(
          'This promo is not valid for the items in this order.',
        );
    }

    const discountAmount = this.calculateDiscount(
      p.type as PromoType,
      Number(p.value),
      orderAmount,
      p.maxDiscount ? Number(p.maxDiscount) : null,
    );

    return { promo: p, discountAmount };
  }

  // ─── CRUD ──────────────────────────────────────────────────────────
  async create(appId: string, dto: CreatePromoDto) {
    // Cek duplikat kode dalam app yang sama
    if (dto.code) {
      const existing = await this.db
        .select()
        .from(schema.promos)
        .where(
          and(eq(schema.promos.appId, appId), eq(schema.promos.code, dto.code)),
        )
        .limit(1);

      if (existing[0])
        throw new ConflictException(`Promo code "${dto.code}" already exists.`);
    }

    const newPromo = await this.db
      .insert(schema.promos)
      .values({
        appId,
        name: dto.name,
        code: dto.code ?? null,
        type: dto.type,
        value: dto.value.toString(),
        minOrder: dto.minOrder?.toString() ?? null,
        maxDiscount: dto.maxDiscount?.toString() ?? null,
        scope: dto.scope ?? PromoScope.ALL,
        itemIds: dto.itemIds ?? null,
        customerIds: dto.customerIds ?? null,
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        usageLimit: dto.usageLimit ?? null,
      })
      .returning();

    return { message: 'Promo successfully created.', data: newPromo[0] };
  }

  async findAll(appId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;

    const [promos, total] = await Promise.all([
      this.db
        .select()
        .from(schema.promos)
        .where(eq(schema.promos.appId, appId))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.promos)
        .where(eq(schema.promos.appId, appId)),
    ]);

    return {
      message: 'Promo list successfully retrieved.',
      ...paginate(promos, Number(total[0].total), page, limit),
    };
  }

  async findOne(appId: string, id: string) {
    const promo = await this.db
      .select()
      .from(schema.promos)
      .where(and(eq(schema.promos.id, id), eq(schema.promos.appId, appId)))
      .limit(1);

    if (!promo[0]) throw new NotFoundException('Promo not found.');

    return { message: 'Promo detail successfully retrieved.', data: promo[0] };
  }

  async update(appId: string, id: string, dto: UpdatePromoDto) {
    // Cek duplikat kode jika code diubah
    if (dto.code) {
      const existing = await this.db
        .select()
        .from(schema.promos)
        .where(
          and(eq(schema.promos.appId, appId), eq(schema.promos.code, dto.code)),
        )
        .limit(1);

      if (existing[0] && existing[0].id !== id)
        throw new ConflictException(`Promo code "${dto.code}" already exists.`);
    }

    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined),
    ) as Record<string, unknown>;

    if (Object.keys(updateData).length === 0)
      throw new BadRequestException('No fields to update.');

    // Convert numeric fields ke string untuk decimal columns
    if (updateData.value !== undefined)
      updateData.value = String(updateData.value);
    if (updateData.minOrder !== undefined)
      updateData.minOrder = String(updateData.minOrder);
    if (updateData.maxDiscount !== undefined)
      updateData.maxDiscount = String(updateData.maxDiscount);

    const updated = await this.db
      .update(schema.promos)
      .set(updateData)
      .where(and(eq(schema.promos.id, id), eq(schema.promos.appId, appId)))
      .returning();

    if (!updated[0]) throw new NotFoundException('Promo not found.');

    return { message: 'Promo successfully updated.', data: updated[0] };
  }

  async remove(appId: string, id: string) {
    // Soft delete via isActive = false
    const deleted = await this.db
      .update(schema.promos)
      .set({ isActive: false })
      .where(and(eq(schema.promos.id, id), eq(schema.promos.appId, appId)))
      .returning();

    if (!deleted[0]) throw new NotFoundException('Promo not found.');

    return { message: 'Promo successfully deactivated.' };
  }

  // ─── Check Promo (preview diskon sebelum checkout) ─────────────────
  async checkPromo(
    appId: string,
    code: string,
    orderAmount: number,
    customerId?: string,
    itemIds?: string[],
  ) {
    const { promo, discountAmount } = await this.validateAndGetPromo(
      appId,
      code,
      orderAmount,
      customerId,
      itemIds,
    );

    return {
      message: 'Promo is valid.',
      data: {
        promoId: promo.id,
        name: promo.name,
        type: promo.type,
        discountAmount,
        finalAmount: orderAmount - discountAmount,
      },
    };
  }
}
