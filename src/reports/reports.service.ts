// cotebek/src/reports/reports.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, gte, lte, sum, count, desc, sql } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getSummary(appId: string, startDate?: string, endDate?: string) {
    const filters = [eq(schema.orders.appId, appId)];

    if (startDate) {
      filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    const result = await this.db
      .select({
        totalRevenue: sum(schema.orders.totalAmount),
        totalCogs: sum(schema.orders.totalCogs),
        totalOrders: count(schema.orders.id),
      })
      .from(schema.orders)
      .where(and(...filters));

    const data = result[0];

    const revenue = Number(data.totalRevenue || 0);
    const cogs = Number(data.totalCogs || 0);
    const grossProfit = revenue - cogs;

    return {
      message: 'Summary report successfully retrieved.',
      data: {
        revenue,
        cogs,
        grossProfit,
        totalOrders: Number(data.totalOrders || 0),
      },
    };
  }

  async getTopItems(appId: string, startDate?: string, endDate?: string) {
    const filters = [eq(schema.orders.appId, appId)];

    if (startDate) {
      filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    const result = await this.db
      .select({
        itemName: schema.orderItems.itemName,
        totalSold: sum(schema.orderItems.qty),
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(and(...filters))
      .groupBy(schema.orderItems.itemName)
      .orderBy(desc(sum(schema.orderItems.qty)))
      .limit(5);

    const formatted = result.map((item) => ({
      itemName: item.itemName,
      totalSold: Number(item.totalSold || 0),
    }));

    return {
      message: 'Top 5 best-selling items successfully retrieved.',
      data: formatted,
    };
  }

  async getSalesTrend(appId: string, startDate?: string, endDate?: string) {
    const filters = [eq(schema.orders.appId, appId)];

    if (startDate) filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    const dateFormatted = sql<string>`TO_CHAR(${schema.orders.createdAt}, 'YYYY-MM-DD')`;

    const result = await this.db
      .select({
        date: dateFormatted,
        revenue: sum(schema.orders.totalAmount),
        cogs: sum(schema.orders.totalCogs),
      })
      .from(schema.orders)
      .where(and(...filters))
      .groupBy(dateFormatted)
      .orderBy(dateFormatted);

    const formatted = result.map((item) => {
      const revenue = Number(item.revenue || 0);
      const cogs = Number(item.cogs || 0);
      return {
        date: item.date,
        revenue,
        profit: revenue - cogs,
      };
    });

    return {
      message: 'Daily sales trend successfully retrieved.',
      data: formatted,
    };
  }

  async getPaymentMethods(appId: string, startDate?: string, endDate?: string) {
    const filters = [eq(schema.transactions.appId, appId)];

    if (startDate) filters.push(gte(schema.transactions.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.transactions.createdAt, end));
    }

    const result = await this.db
      .select({
        method: schema.transactions.paymentMethod,
        totalCount: count(schema.transactions.id),
      })
      .from(schema.transactions)
      .where(and(...filters))
      .groupBy(schema.transactions.paymentMethod)
      .orderBy(desc(count(schema.transactions.id)));

    const totalTransactions = result.reduce(
      (sum, item) => sum + Number(item.totalCount),
      0,
    );

    const formatted = result.map((item) => {
      const usageCount = Number(item.totalCount);
      const percentage = totalTransactions === 0 ? 0 : (usageCount / totalTransactions) * 100;
      return {
        method: item.method || 'UNKNOWN',
        count: usageCount,
        percentage: percentage.toFixed(1) + '%',
      };
    });

    return {
      message: 'Payment method statistics successfully retrieved.',
      data: formatted,
    };
  }

  async getOverview(appId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      ordersToday,
      revenueToday,
      activeOrders,
      totalOrders,
      totalRevenue,
      totalCustomers,
    ] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.appId, appId),
          gte(schema.orders.createdAt, startOfToday),
          lte(schema.orders.createdAt, endOfToday),
        )),

      this.db
        .select({ total: sum(schema.orders.totalAmount) })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.appId, appId),
          gte(schema.orders.createdAt, startOfToday),
          lte(schema.orders.createdAt, endOfToday),
        )),

      this.db
        .select({ count: count() })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.appId, appId),
          sql`${schema.orders.status} != 'DONE'`,
        )),

      this.db
        .select({ count: count() })
        .from(schema.orders)
        .where(eq(schema.orders.appId, appId)),

      this.db
        .select({ total: sum(schema.orders.totalAmount) })
        .from(schema.orders)
        .where(eq(schema.orders.appId, appId)),

      this.db
        .select({ count: count() })
        .from(schema.customers)
        .where(eq(schema.customers.appId, appId)),
    ]);

    return {
      message: 'Overview report successfully retrieved.',
      data: {
        ordersToday:    ordersToday[0]?.count   ?? 0,
        revenueToday:   Number(revenueToday[0]?.total  ?? 0),
        activeOrders:   activeOrders[0]?.count  ?? 0,
        totalOrders:    totalOrders[0]?.count   ?? 0,
        totalRevenue:   Number(totalRevenue[0]?.total  ?? 0),
        totalCustomers: totalCustomers[0]?.count ?? 0,
      },
    };
  }
}
