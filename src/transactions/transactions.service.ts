// cotebek/src/transactions/transactions.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, gte, lte, and, desc, count, sum } from 'drizzle-orm';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { paginate } from 'src/common/utils/paginate.util';
import { generateDocNumber } from 'src/common/utils/doc-number.util';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private auditService: AuditService,
  ) {}

  async create(
    appId: string,
    dto: CreateTransactionDto,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    // Membungkus generate nomor dokumen dan insert ke dalam satu transaksi database
    const { record: newTx, txNumber } = await this.db.transaction(
      async (tx) => {
        const txNumber = await generateDocNumber(tx, appId, 'transaction');

        const fee = dto.fee ?? 0;
        const netAmount =
          dto.type === 'IN' ? dto.amount - fee : dto.amount + fee;

        const inserted = await tx
          .insert(schema.transactions)
          .values({
            appId, // ID usahanya otomatis dari API Key! Gak bisa dipalsukan.
            type: dto.type,
            category: dto.category, // 'SALES', 'EXPENSE', dll
            amount: netAmount.toString(),
            fee: dto.fee ? dto.fee.toString() : undefined,
            paymentMethod: dto.paymentMethod,
            description: dto.description,
            txNumber,
            metadata: dto.metadata, // Catatan JSON bebas
            createdAt: dto.transactionDate
              ? new Date(dto.transactionDate)
              : undefined,
            paymentStatus: dto.paymentStatus ?? 'PAID',
            paidAt:
              (dto.paymentStatus ?? 'PAID') === 'PAID' ? new Date() : null,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          })
          .returning();

        if (dto.items && dto.items.length > 0) {
          await tx.insert(schema.txItems).values(
            dto.items.map((item) => ({
              transactionId: inserted[0].id,
              rawMaterialId: item.rawMaterialId ?? null,
              itemName: item.itemName,
              qty: item.qty.toString(),
              unit: item.unit,
              price: item.price.toString(),
              subtotal: item.subtotal.toString(),
            })),
          );
        }

        return { record: inserted[0], txNumber };
      },
    );

    // Audit log dijalankan di luar transaksi setelah data dipastikan aman tersimpan
    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.CREATE_TRANSACTION,
      entity: 'transactions',
      entityId: newTx.id,
      after: {
        txNumber,
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
      },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Transaction successfully recorded.',
      data: newTx,
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
    if (startDate)
      filters.push(gte(schema.transactions.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.transactions.createdAt, end));
    }
    if (type === 'IN' || type === 'OUT') {
      filters.push(eq(schema.transactions.type, type as any));
    }

    const [result, [{ total }], summaryRows] = await Promise.all([
      // Query 1: paginated rows
      this.db
        .select({
          id: schema.transactions.id,
          appId: schema.transactions.appId,
          txNumber: schema.transactions.txNumber,
          type: schema.transactions.type,
          category: schema.transactions.category,
          amount: schema.transactions.amount,
          fee: schema.transactions.fee,
          paymentMethod: schema.transactions.paymentMethod,
          paymentStatus: schema.transactions.paymentStatus,
          paidAt: schema.transactions.paidAt,
          dueDate: schema.transactions.dueDate,
          teamMemberId: schema.transactions.teamMemberId,
          teamMemberName: schema.teamMembers.name,
          description: schema.transactions.description,
          referenceId: schema.transactions.referenceId,
          metadata: schema.transactions.metadata,
          createdAt: schema.transactions.createdAt,
        })
        .from(schema.transactions)
        .leftJoin(
          schema.teamMembers,
          eq(schema.transactions.teamMemberId, schema.teamMembers.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset),

      // Query 2: total count for pagination
      this.db
        .select({ total: count() })
        .from(schema.transactions)
        .where(and(...filters)),

      // Query 3: SQL SUM GROUP BY — efisien tanpa full-table fetch
      this.db
        .select({
          type: schema.transactions.type,
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(and(...filters))
        .groupBy(schema.transactions.type),
    ]);

    const formatted = result.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
    }));

    // Build summary dari maksimal 2 baris (IN/OUT)
    let totalIn = 0;
    let totalOut = 0;
    summaryRows.forEach((row) => {
      if (row.type === 'IN') totalIn = Number(row.total ?? 0);
      if (row.type === 'OUT') totalOut = Number(row.total ?? 0);
    });

    return {
      message: 'Cash flow history successfully retrieved.',
      summary: { totalIn, totalOut, balance: totalIn - totalOut },
      ...paginate(formatted, Number(total), page, limit),
    };
  }

  async markAsPaid(
    appId: string,
    id: string,
    userId?: string | null,
    ipAddress?: string | null,
  ) {
    const record = await this.db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.appId, appId),
        ),
      )
      .limit(1);

    if (!record[0]) throw new NotFoundException('Transaction not found.');
    if (record[0].paymentStatus === 'PAID') {
      throw new BadRequestException('Transaction is already paid.');
    }

    await this.db
      .update(schema.transactions)
      .set({ paymentStatus: 'PAID', paidAt: new Date() })
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.appId, appId),
        ),
      );

    await this.auditService.log({
      appId,
      userId: userId ?? null,
      action: AUDIT_ACTIONS.MARK_TRANSACTION_PAID,
      entity: 'transactions',
      entityId: id,
      before: { paymentStatus: 'UNPAID' },
      after: { paymentStatus: 'PAID' },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Transaction marked as paid.',
      data: { id, paymentStatus: 'PAID' },
    };
  }

  async findOne(appId: string, id: string) {
    const record = await this.db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.appId, appId),
        ),
      )
      .limit(1);

    if (!record[0]) throw new NotFoundException('Transaction not found.');

    const items = await this.db
      .select()
      .from(schema.txItems)
      .where(eq(schema.txItems.transactionId, id));

    return {
      message: 'Transaction detail retrieved.',
      data: {
        ...record[0],
        amount: Number(record[0].amount),
        items: items.map((i) => ({
          ...i,
          qty: Number(i.qty),
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      },
    };
  }
}
