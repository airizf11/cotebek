// cotebek/src/reports/transactions-reports.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, gte, lte, sum, count, desc, SQL } from 'drizzle-orm';

@Injectable()
export class TransactionsReportsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  private buildDateFilters(
    column: any,
    startDate?: string,
    endDate?: string,
  ): SQL[] {
    const filters: SQL[] = [];
    if (startDate) filters.push(gte(column, new Date(startDate)));
    if (endDate) filters.push(lte(column, new Date(endDate + 'T23:59:59')));
    return filters;
  }

  async getExpenseSummary(appId: string, startDate?: string, endDate?: string) {
    const filters = [
      eq(schema.transactions.appId, appId),
      eq(schema.transactions.type, 'OUT'),
      ...this.buildDateFilters(
        schema.transactions.createdAt,
        startDate,
        endDate,
      ),
    ];

    const result = await this.db
      .select({
        totalOut: sum(schema.transactions.amount),
        totalFee: sum(schema.transactions.fee),
        count: count(schema.transactions.id),
      })
      .from(schema.transactions)
      .where(and(...filters));

    return {
      message: 'Expense summary successfully retrieved.',
      data: {
        totalOut: Number(result[0].totalOut || 0),
        totalFee: Number(result[0].totalFee || 0),
        count: Number(result[0].count || 0),
      },
    };
  }

  async getExpenseByCategory(
    appId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const filters = [
      eq(schema.transactions.appId, appId),
      eq(schema.transactions.type, 'OUT'),
      ...this.buildDateFilters(
        schema.transactions.createdAt,
        startDate,
        endDate,
      ),
    ];

    const result = await this.db
      .select({
        category: schema.transactions.category,
        total: sum(schema.transactions.amount),
        count: count(schema.transactions.id),
      })
      .from(schema.transactions)
      .where(and(...filters))
      .groupBy(schema.transactions.category)
      .orderBy(desc(sum(schema.transactions.amount)));

    return {
      message: 'Expense by category successfully retrieved.',
      data: result.map((r) => ({
        category: r.category,
        total: Number(r.total || 0),
        count: Number(r.count || 0),
      })),
    };
  }
}
