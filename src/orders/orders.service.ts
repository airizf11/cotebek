// cotebek/src/orders/orders.service.ts
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/app-roles.constant';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  async create(appId: string, dto: CreateOrderDto, handledBy?: string | null, ipAddress?: string | null) {
    try {
      // Mulai Database Transaction (tx)
      // Kalau salah satu gagal, semuanya otomatis di-Cancel (Rollback)
      const result = await this.db.transaction(async (tx) => {
        
        // 1. BUAT STRUK INDUK (Insert ke table orders)
        const newOrder = await tx.insert(schema.orders).values({
          appId: appId,
          handledBy: handledBy ?? null,
          orderNumber: dto.orderNumber,
          totalAmount: dto.totalAmount.toString(), // Drizzle butuh string untuk tipe Decimal
          totalCogs: dto.totalCogs.toString(),
          status: 'PAID',
          metadata: dto.metadata,
        }).returning();

        const orderId = newOrder[0].id; // Ambil ID struk yang baru dibuat

        // 2. MASUKKAN BARANG-BARANGNYA (Insert ke table order_items)
        const itemsToInsert = dto.items.map((item) => ({
          orderId: orderId, // Sambungkan ke ID struk di atas
          itemName: item.itemName,
          qty: item.qty.toString(),
          price: item.price.toString(),
          cogs: item.cogs.toString(),
          subtotal: item.subtotal.toString(),
          metadata: item.metadata,
        }));

        await tx.insert(schema.orderItems).values(itemsToInsert);

        // 3. OTOMATIS CATAT UANG MASUK KE BUKU KAS (Insert ke table transactions)
        await tx.insert(schema.transactions).values({
          appId: appId,
          type: 'IN', // Uang masuk
          category: 'SALES', // Kategori jualan
          amount: dto.totalAmount.toString(),
          paymentMethod: dto.paymentMethod,
          description: `Penjualan #${dto.orderNumber}`,
          referenceId: orderId, // Sambungkan ke ID struk
        });

        // Kalau sukses semua, kembalikan data struknya
        return newOrder[0];
      });

      // ✅ Log audit AFTER transaction commit
      await this.auditService.log({
        appId,
        userId: handledBy ?? null,
        action: AUDIT_ACTIONS.CREATE_ORDER,
        entity: 'orders',
        entityId: result.id,
        after: { orderNumber: dto.orderNumber, totalAmount: dto.totalAmount },
        ipAddress: ipAddress ?? null,
      });

      return {
        message: 'Order successfully recorded.',
        data: result,
      };

    } catch (error) {
      console.error('Transaction failed, rollback executed:', error);
      throw new InternalServerErrorException('Failed to process order.');
    }
  }
}