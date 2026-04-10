// cotebek/src/orders/orders.service.ts
import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/app-roles.constant';
import { QueryOrderDto } from './dto/query-order.dto';
import { eq, gte, lte, and, desc, count, sql } from 'drizzle-orm';
import { paginate } from 'src/common/utils/paginate.util';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Status transition rules
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['IN_PROCESS'],
  IN_PROCESS: ['READY'],
  READY: ['DONE'],
  DONE: [],           // terminal — tidak bisa diubah lagi
};

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
          appId,
            customerId: dto.customerId ?? null,   // ✅
            handledBy: handledBy ?? null,
            orderNumber: dto.orderNumber,
            totalAmount: dto.totalAmount.toString(),
            totalCogs: dto.totalCogs.toString(),
            status: 'RECEIVED',                   // ✅ default RECEIVED, not PAID
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null, // ✅
            metadata: dto.metadata,
          })
          .returning();

        const orderId = newOrder[0].id; // Ambil ID struk yang baru dibuat

        // 2. MASUKKAN BARANG-BARANGNYA (Insert ke table order_items)
        const itemsToInsert = dto.items.map((item) => ({
          orderId,
          itemId: item.itemId ?? null,
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
          appId,
          type: 'IN',
          category: 'SALES',
          amount: dto.totalAmount.toString(),
          paymentMethod: dto.paymentMethod,
          description: `Sales order #${dto.orderNumber}`,
          referenceId: orderId,
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

  async findAll(appId: string, query: QueryOrderDto) {
    const { page = 1, limit = 20, offset, status, startDate, endDate, customerId } = query;

    const filters = [eq(schema.orders.appId, appId)];
    if (status) filters.push(eq(schema.orders.status, status as any));
    if (customerId) filters.push(eq(schema.orders.customerId, customerId));
    if (startDate) filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    const [orders, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: schema.orders.id,
          orderNumber: schema.orders.orderNumber,
          totalAmount: schema.orders.totalAmount,
          status: schema.orders.status,
          dueDate: schema.orders.dueDate,
          paymentMethod: schema.orders.paymentMethod,
          handledBy: schema.orders.handledBy,
          customerId: schema.orders.customerId,
          // ✅ join customer name langsung
          customerName: schema.customers.name,
          customerPhone: schema.customers.phone,
          createdAt: schema.orders.createdAt,
        })
        .from(schema.orders)
        .leftJoin(
          schema.customers,
          eq(schema.orders.customerId, schema.customers.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.orders.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ total: count() })
        .from(schema.orders)
        .where(and(...filters)),
    ]);

    const formatted = orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
    }));

    return {
      message: 'Order list successfully retrieved.',
      ...paginate(formatted, Number(total), page, limit),
    };
  }

  async findOne(appId: string, id: string) {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .limit(1);

    if (!order[0]) throw new NotFoundException('Order not found.');

    // Get order items
    const items = await this.db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    return {
      message: 'Order detail successfully retrieved.',
      data: {
        ...order[0],
        totalAmount: Number(order[0].totalAmount),
        totalCogs: Number(order[0].totalCogs),
        items: items.map((i) => ({
          ...i,
          qty: Number(i.qty),
          price: Number(i.price),
          cogs: Number(i.cogs),
          subtotal: Number(i.subtotal),
        })),
      },
    };
  }

  async updateStatus(
    appId: string,
    id: string,
    dto: UpdateOrderStatusDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .limit(1);

    if (!order[0]) throw new NotFoundException('Order not found.');

    const currentStatus = order[0].status as string;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];

    // ✅ Guard: hanya allow forward transition
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none (terminal status)'}`,
      );
    }

    const updated = await this.db
      .update(schema.orders)
      .set({ status: dto.status as any })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .returning();

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_ORDER, // reuse — atau bisa tambah UPDATE_ORDER_STATUS nanti
      entity: 'orders',
      entityId: id,
      before: { status: currentStatus },
      after: { status: dto.status },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: `Order status updated to ${dto.status}.`,
      data: { id, status: dto.status },
    };
  }

  async getActiveOrders(appId: string) {
    const activeOrders = await this.db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        totalAmount: schema.orders.totalAmount,
        status: schema.orders.status,
        dueDate: schema.orders.dueDate,
        customerName: schema.customers.name,
        customerPhone: schema.customers.phone,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.orders.appId, appId),
          sql`${schema.orders.status} != 'DONE'`, // semua selain DONE
        ),
      )
      .orderBy(schema.orders.dueDate); // ✅ urutkan by due date — yang mau jatuh tempo duluan

    return {
      message: 'Active orders successfully retrieved.',
      data: activeOrders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
      })),
    };
  }
}