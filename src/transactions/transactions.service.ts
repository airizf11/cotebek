// cotebek/src/transactions/transactions.service.ts
import { Inject, Injectable } from '@nestjs/common';
// import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async create(appId: string, dto: any) { // Sementara pakai any dulu biar cepet tesnya
    
    // Insert data ke tabel transaksi ledger
    const newTx = await this.db.insert(schema.transactions).values({
      appId: appId, // ID usahanya otomatis dari API Key! Gak bisa dipalsukan.
      type: dto.type,
      category: dto.category, // 'SALES', 'EXPENSE', dll
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      metadata: dto.metadata, // Catatan JSON bebas
    }).returning();

    return {
      message: 'Transaksi berhasil dicatat ke Ledger!',
      data: newTx[0],
    };
  }

  async findAll(appId: string, startDate?: string, endDate?: string, type?: string) {
    // 1. Siapkan array filter dasar (wajib sesuai appId)
    const filters =[eq(schema.transactions.appId, appId)];

    // 2. Tambahkan filter tanggal jika dikirim dari Front-End
    if (startDate) {
      filters.push(gte(schema.transactions.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.transactions.createdAt, end));
    }

    // 3. Tambahkan filter tipe ('IN' / 'OUT') jika diminta
    if (type && (type === 'IN' || type === 'OUT')) {
      filters.push(eq(schema.transactions.type, type as any));
    }

    // 4. Tarik data dari Database dan urutkan dari yang TERBARU (descending)
    const result = await this.db
      .select()
      .from(schema.transactions)
      .where(and(...filters))
      .orderBy(desc(schema.transactions.createdAt)); // Mirip m-Banking, transaksi terbaru di atas!

    // Rapikan format angka (karena Decimal dari Postgres dibaca sebagai string)
    const formattedResult = result.map((tx) => ({
      ...tx,
      amount: Number(tx.amount), // Ubah string '25000.00' jadi number 25000
    }));

    // 5. Hitung sekalian Total IN dan Total OUT untuk summary di layar kasir
    let totalIn = 0;
    let totalOut = 0;
    formattedResult.forEach((tx) => {
      if (tx.type === 'IN') totalIn += tx.amount;
      if (tx.type === 'OUT') totalOut += tx.amount;
    });

    return {
      message: 'Riwayat mutasi kas berhasil ditarik',
      summary: {
        totalIn,
        totalOut,
        balance: totalIn - totalOut, // Saldo bersih dari mutasi yang difilter
      },
      data: formattedResult,
    };
  }
}