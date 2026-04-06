// cotebek/src/apps/apps.service.ts
import { Inject, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { CreateAppDto } from './dto/create-app.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class AppsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // 1. BIKIN USAHA BARU
  async createAppWithOwner(userId: string, dto: CreateAppDto) {
    const generatedApiKey = 'app_' + crypto.randomBytes(16).toString('hex');

    // Gunakan transaksi agar kalau gagal 1, gagal semua
    const result = await this.db.transaction(async (tx) => {
      // a. Bikin Usahanya
      const newApp = await tx.insert(schema.apps).values({
        name: dto.name,
        apiKey: generatedApiKey,
      }).returning();

      const appId = newApp[0].id;

      // b. Jadikan user yang bikin sebagai OWNER dengan status ACTIVE
      await tx.insert(schema.userApps).values({
        userId: userId,
        appId: appId,
        role: 'OWNER',
        status: 'ACTIVE',
      });

      return newApp[0];
    });

    return { message: 'Usaha berhasil dibuat, kamu adalah Owner!', data: result };
  }

  // 2. KARYAWAN MINTA GABUNG (Pakai API Key toko)
  async requestJoinApp(userId: string, apiKey: string) {
    // Cari tokonya berdasarkan apiKey
    const targetApp = await this.db.select().from(schema.apps).where(eq(schema.apps.apiKey, apiKey)).limit(1);
    
    if (!targetApp[0]) throw new NotFoundException('API Key Usaha tidak valid');
    const appId = targetApp[0].id;

    // Cek apakah udah pernah join
    const existing = await this.db.select().from(schema.userApps)
      .where(and(eq(schema.userApps.userId, userId), eq(schema.userApps.appId, appId))).limit(1);

    if (existing[0]) throw new BadRequestException('Kamu sudah terdaftar di usaha ini dengan status: ' + existing[0].status);

    // Insert dengan status PENDING
    await this.db.insert(schema.userApps).values({
      userId: userId,
      appId: appId,
      role: 'STAFF',
      status: 'PENDING',
    });

    return { message: 'Permintaan gabung terkirim! Menunggu persetujuan Owner.' };
  }

  // 3. OWNER LIHAT DAFTAR KARYAWAN
  async getAppMembers(ownerId: string, appId: string) {
    // Pengecekan keamanan: Apakah yang nge-hit API ini adalah OWNER dari app tersebut?
    await this.verifyOwner(ownerId, appId);

    const members = await this.db.select({
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.userApps.role,
      status: schema.userApps.status,
    })
    .from(schema.userApps)
    .innerJoin(schema.users, eq(schema.userApps.userId, schema.users.id))
    .where(eq(schema.userApps.appId, appId));

    return { message: 'Daftar anggota ditarik', data: members };
  }

  // 4. OWNER APPROVE KARYAWAN PENDING
  async approveMember(ownerId: string, appId: string, targetUserId: string) {
    // Cek dulu apakah dia beneran OWNER
    await this.verifyOwner(ownerId, appId);

    const updated = await this.db.update(schema.userApps)
      .set({ status: 'ACTIVE' })
      .where(and(eq(schema.userApps.appId, appId), eq(schema.userApps.userId, targetUserId), eq(schema.userApps.status, 'PENDING')))
      .returning();

    if (!updated[0]) throw new NotFoundException('Karyawan tidak ditemukan atau statusnya bukan PENDING');

    return { message: 'Karyawan berhasil disetujui untuk mulai bekerja!' };
  }

  // --- Fungsi Bantuan untuk Cek Keamanan ---
  private async verifyOwner(userId: string, appId: string) {
    const isOwner = await this.db.select().from(schema.userApps)
      .where(and(
        eq(schema.userApps.userId, userId), 
        eq(schema.userApps.appId, appId),
        eq(schema.userApps.role, 'OWNER')
      )).limit(1);

    if (!isOwner[0]) throw new UnauthorizedException('Akses ditolak! Kamu bukan Owner usaha ini.');
  }
}