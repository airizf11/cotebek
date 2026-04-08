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
    // 1. Siapkan Filter Dasar (Wajib filter berdasarkan Cabang Usaha)
    const filters = [eq(schema.orders.appId, appId)];

    // 2. Kalau ada filter tanggal, tambahkan ke array filter
    if (startDate) {
      filters.push(gte(schema.orders.createdAt, new Date(startDate))); // gte = Greater Than or Equal (Lebih dari)
    }
    if (endDate) {
      // Tambah jam 23:59:59 biar full sampai akhir hari
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end)); // lte = Less Than or Equal (Kurang dari)
    }

    // 3. SURUH DRIZZLE MENGHITUNG! (The Magic)
    const result = await this.db
      .select({
        totalRevenue: sum(schema.orders.totalAmount), // Hitung total Omset
        totalCogs: sum(schema.orders.totalCogs),     // Hitung total Modal
        totalTransactions: count(schema.orders.id),  // Hitung jumlah struk
      })
      .from(schema.orders)
      .where(and(...filters)); // Gabungkan semua filter (appId DAN startDate DAN endDate)

    // Drizzle akan mengembalikan array, kita ambil index ke-0
    const data = result[0];

    // Rapikan datanya (karena Postgres mengembalikan tipe Decimal sebagai string)
    const omset = Number(data.totalRevenue || 0);
    const modal = Number(data.totalCogs || 0);
    const labaKotor = omset - modal;

    return {
      message: 'Laporan Summary Berhasil Ditarik',
      data: {
        omset: omset,
        modal: modal,
        labaKotor: labaKotor,
        totalTransaksi: Number(data.totalTransactions || 0),
      },
    };
  }

  async getTopItems(appId: string, startDate?: string, endDate?: string) {
    // 1. Siapkan filter yang sama persis seperti getSummary
    const filters =[eq(schema.orders.appId, appId)];

    if (startDate) {
      filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    // 2. QUERY SAKTI: Join, Group By, dan Order By
    const result = await this.db
      .select({
        itemName: schema.orderItems.itemName,
        totalSold: sum(schema.orderItems.qty), // Jumlahkan Qty (kuantitas)
      })
      .from(schema.orderItems)
      // Gabungkan tabel order_items dengan tabel orders
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(and(...filters)) // Pasang filter tanggal & appId
      .groupBy(schema.orderItems.itemName) // Kelompokkan berdasarkan nama barang
      .orderBy(desc(sum(schema.orderItems.qty))) // Urutkan dari yang terbanyak (descending)
      .limit(5); // Ambil Top 5 saja

    // Rapikan data karena hasil 'sum' biasanya berupa string desimal dari Postgres
    const formattedResult = result.map((item) => ({
      itemName: item.itemName,
      totalSold: Number(item.totalSold || 0),
    }));

    return {
      message: 'Top 5 Barang Paling Laku Berhasil Ditarik',
      data: formattedResult,
    };
  }

  // FITUR 1: SALES TREND (Pergerakan Penjualan Harian)
  async getSalesTrend(appId: string, startDate?: string, endDate?: string) {
    const filters =[eq(schema.orders.appId, appId)];

    if (startDate) filters.push(gte(schema.orders.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.orders.createdAt, end));
    }

    // Gunakan fungsi sql dari Drizzle untuk memotong format tanggal PostgreSQL jadi YYYY-MM-DD
    const dateFormatted = sql<string>`TO_CHAR(${schema.orders.createdAt}, 'YYYY-MM-DD')`;

    const result = await this.db
      .select({
        date: dateFormatted,
        revenue: sum(schema.orders.totalAmount),
        cogs: sum(schema.orders.totalCogs),
      })
      .from(schema.orders)
      .where(and(...filters))
      .groupBy(dateFormatted) // Kelompokkan omset berdasarkan hari
      .orderBy(dateFormatted); // Urutkan dari tanggal paling tua ke terbaru

    // Rapikan data dan hitung profit harian
    const formattedResult = result.map((item) => {
      const omset = Number(item.revenue || 0);
      const modal = Number(item.cogs || 0);
      return {
        date: item.date,
        revenue: omset,
        profit: omset - modal, // Laba kotor harian
      };
    });

    return {
      message: 'Tren Penjualan Harian Berhasil Ditarik',
      data: formattedResult,
    };
  }

  // FITUR 3: PAYMENT METHODS (Statistik Metode Pembayaran)
  async getPaymentMethods(appId: string, startDate?: string, endDate?: string) {
    const filters =[eq(schema.transactions.appId, appId)];

    if (startDate) filters.push(gte(schema.transactions.createdAt, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.push(lte(schema.transactions.createdAt, end));
    }

    // Tarik dan kelompokkan berdasarkan kolom paymentMethod
    const result = await this.db
      .select({
        method: schema.transactions.paymentMethod,
        totalCount: count(schema.transactions.id), // Hitung berapa kali dipakai
      })
      .from(schema.transactions)
      .where(and(...filters))
      .groupBy(schema.transactions.paymentMethod)
      .orderBy(desc(count(schema.transactions.id)));

    // Hitung total semua transaksi untuk mencari Persentase (%)
    let totalTransactions = 0;
    result.forEach((item) => {
      totalTransactions += Number(item.totalCount);
    });

    const formattedResult = result.map((item) => {
      const usageCount = Number(item.totalCount);
      const percentage = totalTransactions === 0 ? 0 : (usageCount / totalTransactions) * 100;
      
      return {
        method: item.method || 'UNKNOWN',
        count: usageCount,
        percentage: percentage.toFixed(1) + '%', // Contoh hasil: "70.5%"
      };
    });

    return {
      message: 'Statistik Metode Pembayaran Berhasil Ditarik',
      data: formattedResult,
    };
  }
}