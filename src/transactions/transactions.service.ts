// cotebek/src/transactions/transactions.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, gte, lte, and, desc, count } from 'drizzle-orm';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/app-roles.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { paginate } from 'src/common/utils/paginate.util';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  async create(appId: string, dto: CreateTransactionDto, userId?: string | null, ipAddress?: string | null) {
    
    // Insert data ke tabel transaksi ledger
    const newTx = await this.db.insert(schema.transactions).values({
      appId: appId, // ID usahanya otomatis dari API Key! Gak bisa dipalsukan.
      type: dto.type,
      category: dto.category, // 'SALES', 'EXPENSE', dll
      amount: dto.amount.toString(),
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      metadata: dto.metadata, // Catatan JSON bebas
    }).returning();

    await this.auditService.log({ // ✅
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_TRANSACTION,
      entity: 'transactions',
      entityId: newTx[0].id,
      after: { type: dto.type, category: dto.category, amount: dto.amount },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Transaction successfully recorded.',
      data: newTx[0],
      amount: dto.amount.toString(),
    };
  }

  async findAll(
  appId: string,
  pagination: PaginationDto,
  startDate?: string,
  endDate?: string,
  type?: string,
) {
  const { page = 1, limit = 20, offset } = pagination;

  const filters = [eq(schema.transactions.appId, appId)];
  if (startDate) filters.push(gte(schema.transactions.createdAt, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filters.push(lte(schema.transactions.createdAt, end));
  }
  if (type === 'IN' || type === 'OUT') {
    filters.push(eq(schema.transactions.type, type as any));
  }

  const [result, [{ total }], summaryResult] = await Promise.all([
    this.db
      .select()
      .from(schema.transactions)
      .where(and(...filters))
      .orderBy(desc(schema.transactions.createdAt))
      .limit(limit)
      .offset(offset),

    this.db
      .select({ total: count() })
      .from(schema.transactions)
      .where(and(...filters)),

    // Summary always against full dataset (no pagination)
    this.db
      .select()
      .from(schema.transactions)
      .where(and(...filters)),
  ]);

  const formatted = result.map(tx => ({ ...tx, amount: Number(tx.amount) }));

  let totalIn = 0;
  let totalOut = 0;
  summaryResult.forEach(tx => {
    if (tx.type === 'IN') totalIn += Number(tx.amount);
    if (tx.type === 'OUT') totalOut += Number(tx.amount);
  });

  return {
    message: 'Cash flow history successfully retrieved.',
    summary: { totalIn, totalOut, balance: totalIn - totalOut },
    ...paginate(formatted, Number(total), page, limit),
  };
}
}