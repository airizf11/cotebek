// cotebek/src/items/items.service.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ItemsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // 1. TAMBAH BARANG BARU
  async create(appId: string, dto: CreateItemDto) {
    const newItem = await this.db.insert(schema.items).values({
      appId: appId,
      name: dto.name,
      sku: dto.sku,
      price: dto.price.toString(), // Database Decimal butuh string
      cogs: (dto.cogs || 0).toString(),
      category: dto.category,
    }).returning();

    return { message: 'Menu berhasil ditambahkan', data: newItem[0] };
  }

  // 2. LIHAT SEMUA BARANG (YANG MASIH AKTIF)
  async findAll(appId: string) {
    const allItems = await this.db
      .select()
      .from(schema.items)
      .where(
        and(
          eq(schema.items.appId, appId),
          eq(schema.items.isActive, true) // Cuma tampilkan yang aktif (gak di soft-delete)
        )
      );
      
    // Rapikan angka
    const formatted = allItems.map(item => ({
      ...item,
      price: Number(item.price),
      cogs: Number(item.cogs),
    }));

    return { message: 'Daftar menu berhasil ditarik', data: formatted };
  }

  // 3. LIHAT DETAIL 1 BARANG
  async findOne(appId: string, id: string) {
    const item = await this.db
      .select()
      .from(schema.items)
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId)))
      .limit(1);

    if (!item[0]) throw new NotFoundException('Barang tidak ditemukan');

    return {
    message: 'Detail barang berhasil ditarik',  // ✅ consistent response shape
    data: {
      ...item[0],
      price: Number(item[0].price),
      cogs: Number(item[0].cogs),}, };
  }

  // 4. UPDATE DATA BARANG
  async update(appId: string, id: string, dto: UpdateItemDto) {
    // Siapkan objek update (hanya update yang dikirim saja)
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.price !== undefined) updateData.price = dto.price.toString();
    if (dto.cogs !== undefined) updateData.cogs = dto.cogs.toString();
    if (dto.category !== undefined) updateData.category = dto.category;

    // Guard: reject empty update payload
  if (Object.keys(updateData).length === 0) {
    throw new BadRequestException('Tidak ada field yang diupdate');
  }

    const updatedItem = await this.db.update(schema.items)
      .set(updateData)
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId))) // Kunci keamanan!
      .returning();

    if (!updatedItem[0]) throw new NotFoundException('Barang tidak ditemukan untuk diupdate');

    return { message: 'Menu berhasil diupdate', data: updatedItem[0],
      price: Number(updatedItem[0].price), // ✅ consistent number conversion
      cogs: Number(updatedItem[0].cogs),
     };
  }

  // 5. HAPUS BARANG (SOFT DELETE)
  async remove(appId: string, id: string) {
    // KITA TIDAK PAKAI .delete(), TAPI PAKAI .update() isActive = false
    const deletedItem = await this.db.update(schema.items)
      .set({ isActive: false })
      .where(and(eq(schema.items.id, id), eq(schema.items.appId, appId)))
      .returning();

    if (!deletedItem[0]) throw new NotFoundException('Barang tidak ditemukan');

    return { message: 'Menu berhasil dihapus (disembunyikan dari kasir)' };
  }
}