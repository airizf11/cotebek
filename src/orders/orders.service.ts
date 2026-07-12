// cotebek/src/orders/orders.service.ts
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
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
import { generateDocNumber } from 'src/common/utils/doc-number.util';

// Status transition rules
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['IN_PROCESS', 'CANCELLED'],
  IN_PROCESS: ['READY', 'CANCELLED'],
  READY: ['DONE', 'CANCELLED'], // ← opsional, tergantung bisnis rule
  DONE: [], // terminal — tidak bisa diubah lagi
  CANCELLED: [], // terminal — tidak bisa diubah lagi
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
      let teamMemberId: string | null = null;
      if (dto.teamMemberId) {
        const member = await this.db
          .select()
          .from(schema.teamMembers)
          .where(
            and(
              eq(schema.teamMembers.id, dto.teamMemberId),
              eq(schema.teamMembers.appId, appId),
            ),
          )
          .limit(1);

        if (!member[0]) {
          throw new BadRequestException('Team member not found.');
        }

        // Lapis 1: STAFF cuma boleh pilih dirinya sendiri, atau anggota
        // yang gak punya akun (gak ada userId nempel). OWNER/ADMIN bebas.
        if (handledBy) {
          const callerRole = await this.db
            .select({ role: schema.userApps.role })
            .from(schema.userApps)
            .where(
              and(
                eq(schema.userApps.userId, handledBy),
                eq(schema.userApps.appId, appId),
              ),
            )
            .limit(1);

          const role = callerRole[0]?.role;
          const isSelf = member[0].userId === handledBy;
          const isUnlinked = member[0].userId === null;

          if (role === 'STAFF' && !isSelf && !isUnlinked) {
            throw new ForbiddenException(
              'Staff can only log entries under their own name or a team member without a linked account.',
            );
          }
        }

        teamMemberId = dto.teamMemberId;
      }

      const { order: result, orderNumber } = await this.db.transaction(
        async (tx) => {
          // doc number — sudah fix #1, tetap di sini
          const orderNumber = await generateDocNumber(tx, appId, 'order');

          // Fix #2: promo validation dipindah ke DALAM transaction, pass tx
          let promoId: string | null = null;
          let discountAmount = 0;

          if (dto.promoCode) {
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
                tx, // ← pass tx biar lock-nya satu transaksi
              );
            promoId = promo.id;
            discountAmount = discount;
          }

          const finalAmount = dto.totalAmount - discountAmount;

          const newOrder = await tx
            .insert(schema.orders)
            .values({
              appId,
              customerId: dto.customerId ?? null,
              handledBy: handledBy ?? null,
              teamMemberId,
              orderNumber,
              totalAmount: dto.totalAmount.toString(),
              totalCogs: dto.totalCogs.toString(),
              status: 'RECEIVED',
              dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
              metadata: dto.metadata,
              promoId,
              discountAmount: discountAmount.toString(),
              finalAmount: finalAmount.toString(),
              paymentMethod: dto.paymentMethod,
              paymentStatus: dto.paymentStatus ?? 'PAID',
              paidAt:
                (dto.paymentStatus ?? 'PAID') === 'PAID' ? new Date() : null,
            })
            .returning();

          const orderId = newOrder[0].id;

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

          if ((dto.paymentStatus ?? 'PAID') === 'PAID') {
            await tx.insert(schema.transactions).values({
              appId,
              type: 'IN',
              category: 'SALES',
              amount: finalAmount.toString(),
              paymentMethod: dto.paymentMethod,
              description: `Sales for ${orderNumber}`,
              referenceId: orderId,
            });
          }

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

          return { order: newOrder[0], orderNumber };
        },
      );

      await this.auditService.log({
        appId,
        userId: handledBy ?? null,
        action: AUDIT_ACTIONS.CREATE_ORDER,
        entity: 'orders',
        entityId: result.id,
        after: { orderNumber, totalAmount: dto.totalAmount },
        ipAddress: ipAddress ?? null,
      });

      return { message: 'Order successfully recorded.', data: result };
    } catch (error) {
      if (error instanceof HttpException) throw error;

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
          discountAmount: schema.orders.discountAmount,
          finalAmount: schema.orders.finalAmount,
          status: schema.orders.status,
          dueDate: schema.orders.dueDate,
          paymentMethod: schema.orders.paymentMethod,
          paymentStatus: schema.orders.paymentStatus,
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
      discountAmount: Number(o.discountAmount),
      finalAmount: Number(o.finalAmount),
    }));

    return {
      message: 'Order list successfully retrieved.',
      ...paginate(formatted, Number(total), page, limit),
    };
  }

  async findOne(appId: string, id: string) {
    const order = await this.db
      .select({
        id: schema.orders.id,
        orderNumber: schema.orders.orderNumber,
        status: schema.orders.status,
        totalAmount: schema.orders.totalAmount,
        totalCogs: schema.orders.totalCogs,
        discountAmount: schema.orders.discountAmount,
        finalAmount: schema.orders.finalAmount,
        paymentMethod: schema.orders.paymentMethod,
        paymentStatus: schema.orders.paymentStatus,
        paidAt: schema.orders.paidAt,
        dueDate: schema.orders.dueDate,
        metadata: schema.orders.metadata,
        createdAt: schema.orders.createdAt,
        customerId: schema.orders.customerId,
        customerName: schema.customers.name,
        customerPhone: schema.customers.phone,
        handledBy: schema.orders.handledBy,
        handledByName: schema.users.name,
        teamMemberId: schema.orders.teamMemberId,
        teamMemberName: schema.teamMembers.name,
        promoId: schema.orders.promoId,
        promoName: schema.promos.name,
        promoCode: schema.promos.code,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id),
      )
      .leftJoin(schema.users, eq(schema.orders.handledBy, schema.users.id))
      .leftJoin(
        schema.teamMembers,
        eq(schema.orders.teamMemberId, schema.teamMembers.id),
      )
      .leftJoin(schema.promos, eq(schema.orders.promoId, schema.promos.id))
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
        discountAmount: Number(order[0].discountAmount),
        finalAmount: Number(order[0].finalAmount),
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

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.orders)
        .set({ status: dto.status })
        .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)));

      // Order dibatalkan & sempet ada duit masuk (finalAmount > 0) →
      // bikin entri pembalik biar ledger tetep akurat, gak diam-diam bolong.
      const finalAmount = order[0].finalAmount;
      if (
        dto.status === 'CANCELLED' &&
        order[0].paymentStatus === 'PAID' &&
        finalAmount !== null &&
        Number(finalAmount) > 0
      ) {
        await tx.insert(schema.transactions).values({
          appId,
          type: 'OUT',
          category: 'ADJUSTMENT',
          amount: finalAmount,
          paymentMethod: order[0].paymentMethod,
          description: `Cancellation of order ${order[0].orderNumber}`,
          referenceId: id,
        });
      }
    });

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
        finalAmount: schema.orders.finalAmount,
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
          sql`${schema.orders.status} NOT IN ('DONE', 'CANCELLED')`, // semua selain DONE, Cancelled
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
        paymentStatus: schema.orders.paymentStatus,
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
        paymentStatus: schema.orders.paymentStatus,
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

  async markAsPaid(
    appId: string,
    id: string,
    paymentMethod?: string,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)))
      .limit(1);

    if (!order[0]) throw new NotFoundException('Order not found.');
    if (order[0].paymentStatus === 'PAID') {
      throw new BadRequestException('Order is already paid.');
    }
    if (order[0].status === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled.');
    }

    const finalMethod = paymentMethod ?? order[0].paymentMethod;

    const finalAmount = order[0].finalAmount;
    if (finalAmount === null) {
      throw new BadRequestException('Order has no valid final amount.');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.orders)
        .set({
          paymentStatus: 'PAID',
          paidAt: new Date(),
          paymentMethod: finalMethod,
        })
        .where(and(eq(schema.orders.id, id), eq(schema.orders.appId, appId)));

      await tx.insert(schema.transactions).values({
        appId,
        type: 'IN',
        category: 'SALES',
        amount: finalAmount,
        paymentMethod: finalMethod,
        description: `Sales for ${order[0].orderNumber}`,
        referenceId: id,
      });
    });

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.MARK_ORDER_PAID,
      entity: 'orders',
      entityId: id,
      before: { paymentStatus: 'UNPAID' },
      after: { paymentStatus: 'PAID', paymentMethod: finalMethod },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Order marked as paid.',
      data: { id, paymentStatus: 'PAID' },
    };
  }
}
