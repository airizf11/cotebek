// cotebek/src/orders/orders.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';
import { QueryOrderDto } from './dto/query-order.dto';
import { eq, gte, lte, and, desc, count, sql } from 'drizzle-orm';
import { paginate } from 'src/common/utils/paginate.util';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PromosService } from 'src/promos/promos.service';

// Status transition rules
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['IN_PROCESS'],
  IN_PROCESS: ['READY'],
  READY: ['DONE'],
  DONE: [], // terminal — tidak bisa diubah lagi
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
    private promosService: PromosService,
  ) {}

  async create(
    appId: string,
    dto: CreateOrderDto,
    handledBy?: string | null,
    ipAddress?: string | null,
  ) {
    try {
      let promoId: string | null = null;
      let discountAmount = 0;

      if (dto.promoCode) {
        // Ambil itemIds dari dto.items untuk validasi scope SPECIFIC_ITEMS
        const itemIds = dto.items
          .map((i) => i.itemId)
          .filter(Boolean) as string[];

        const { promo, discountAmount: discount } =
          await this.promosService.validateAndGetPromo(
            appId,
            dto.promoCode,
            dto.totalAmount,
            dto.customerId ?? null,
            itemIds,
          );

        promoId = promo.id;
        discountAmount = discount;
      }

      const finalAmount = dto.totalAmount - discountAmount;
      // Mulai Database Transaction (tx)
      // Kalau salah satu gagal, semuanya otomatis di-Cancel (Rollback)
      const result = await this.db.transaction(async (tx) => {
        // 1. BUAT STRUK INDUK (Insert ke table orders)
        const newOrder = await tx
          .insert(schema.orders)
          .values({
            appId,
            customerId: dto.customerId ?? null,
            handledBy: handledBy ?? null,
            orderNumber: dto.orderNumber,
            totalAmount: dto.totalAmount.toString(),
            totalCogs: dto.totalCogs.toString(),
            status: 'RECEIVED', // ✅ default RECEIVED, not PAID
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null, // ✅
            metadata: dto.metadata,
            promoId: promoId,
            discountAmount: discountAmount.toString(),
            finalAmount: finalAmount.toString(),
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
          amount: finalAmount.toString(),
          paymentMethod: dto.paymentMethod,
          description: `Sales order #${dto.orderNumber}`,
          referenceId: orderId,
        });

        // Catat promo usage + increment usageCount jika ada promo
        if (promoId) {
          await tx.insert(schema.promoUsages).values({
            appId,
            promoId,
            orderId,
            customerId: dto.customerId ?? null,
            discountAmount: discountAmount.toString(),
          });

          await tx
            .update(schema.promos)
            .set({ usageCount: sql`${schema.promos.usageCount} + 1` })
            .where(eq(schema.promos.id, promoId));
        }

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
      this.logger.error(
        'Order transaction failed, rollback executed',
        error instanceof Error ? error.stack : String(error),
        OrdersService.name,
      );
      throw new InternalServerErrorException('Failed to process order.');
    }
  }

  async findAll(appId: string, query: QueryOrderDto) {
    const {
      page = 1,
      limit = 20,
      offset,
      status,
      startDate,
      endDate,
      customerId,
    } = query;

    const filters = [eq(schema.orders.appId, appId)];
    if (status) filters.push(eq(schema.orders.status, status as any));
    if (customerId) filters.push(eq(schema.orders.customerId, customerId));
    if (startDate)
      filters.push(gte(schema.orders.createdAt, new Date(startDate)));
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
      .set({ status: dto.status })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .returning();

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.UPDATE_ORDER_STATUS,
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

  async trackOrder(orderNumber: string) {
    // Cari order by orderNumber
    const order = await this.db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        dueDate: schema.orders.dueDate,
        createdAt: schema.orders.createdAt,
        customerName: schema.customers.name,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id),
      )
      .where(eq(schema.orders.orderNumber, orderNumber))
      .limit(1);

    if (!order[0]) throw new NotFoundException('Order not found.');

    // Ambil items
    const items = await this.db
      .select({
        itemName: schema.orderItems.itemName,
        qty: schema.orderItems.qty,
      })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order[0].id));

    // Ambil status history dari audit log
    const history = await this.db
      .select({
        action: schema.auditLogs.action,
        before: schema.auditLogs.before,
        after: schema.auditLogs.after,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.entityId, order[0].id),
          eq(schema.auditLogs.entity, 'orders'),
        ),
      )
      .orderBy(schema.auditLogs.createdAt);

    return {
      message: 'Order tracking info retrieved.',
      data: {
        orderNumber: order[0].orderNumber,
        status: order[0].status,
        dueDate: order[0].dueDate,
        createdAt: order[0].createdAt,
        customerName: order[0].customerName ?? null,
        items: items.map((i) => ({
          itemName: i.itemName,
          qty: Number(i.qty),
        })),
        statusHistory: history.map((h) => ({
          status: (h.after as any)?.status ?? null,
          timestamp: h.createdAt,
        })),
      },
    };
  }

  async getReceiptData(appId: string, id: string) {
    // Ambil order + customer sekaligus
    const order = await this.db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        totalAmount: schema.orders.totalAmount,
        discountAmount: schema.orders.discountAmount,
        finalAmount: schema.orders.finalAmount,
        promoId: schema.orders.promoId,
        totalCogs: schema.orders.totalCogs,
        paymentMethod: schema.orders.paymentMethod,
        dueDate: schema.orders.dueDate,
        createdAt: schema.orders.createdAt,
        customerName: schema.customers.name,
        customerPhone: schema.customers.phone,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id),
      )
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .limit(1);

    if (!order[0]) throw new NotFoundException('Order not found.');

    const o = order[0];

    // ─── TARUH DI SINI — setelah const o = order[0] ───────────────────
    let promoName: string | null = null;
    if (o.promoId) {
      const promo = await this.db
        .select({ name: schema.promos.name, code: schema.promos.code })
        .from(schema.promos)
        .where(eq(schema.promos.id, o.promoId))
        .limit(1);
      promoName = promo[0]?.name ?? null;
    }

    // Ambil order items
    const items = await this.db
      .select({
        itemName: schema.orderItems.itemName,
        qty: schema.orderItems.qty,
        price: schema.orderItems.price,
        subtotal: schema.orderItems.subtotal,
      })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    // Ambil app settings untuk info bisnis
    const settings = await this.db
      .select({ key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.appId, appId));

    // Convert settings array → map
    const settingsMap = settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return {
      message: 'Receipt data successfully retrieved.',
      data: {
        business: {
          name: settingsMap['business_name'] ?? 'Business Name',
          address: settingsMap['business_address'] ?? null,
          phone: settingsMap['business_phone'] ?? null,
          footer: settingsMap['receipt_footer'] ?? 'Thank you for your order!',
        },
        order: {
          orderNumber: o.orderNumber,
          status: o.status,
          paymentMethod: o.paymentMethod,
          dueDate: o.dueDate,
          createdAt: o.createdAt,
        },
        customer: {
          name: o.customerName ?? null,
          phone: o.customerPhone ?? null,
        },
        items: items.map((i) => ({
          itemName: i.itemName,
          qty: Number(i.qty),
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
        summary: {
          subtotal: Number(o.totalAmount),
          discountAmount: Number(o.discountAmount ?? 0),
          promoName, // "Diskon Lebaran 20%" atau null
          total: Number(o.finalAmount ?? o.totalAmount),
        },
      },
    };
  }
}
