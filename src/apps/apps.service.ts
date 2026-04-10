// cotebek/src/apps/apps.service.ts
import { Inject, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { CreateAppDto } from './dto/create-app.dto';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as crypto from 'crypto';
import { eq, and, count } from 'drizzle-orm';
import { APP_ROLES, AUDIT_ACTIONS, JOIN_STATUS } from 'src/common/constants/app-roles.constant';
import { AuditService } from 'src/common/services/audit.service';
import { paginate } from 'src/common/utils/paginate.util';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class AppsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  private auditService: AuditService,) {}

  // 1. BIKIN USAHA BARU
  async createAppWithOwner(userId: string, dto: CreateAppDto, ipAddress?: string | null) {
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
        role: APP_ROLES.OWNER,
        status: JOIN_STATUS.ACTIVE,
      });

      return newApp[0];
    });

    await this.auditService.log({
    appId: result.id,
    userId,
    action: AUDIT_ACTIONS.CREATE_APP,
    entity: 'apps',
    entityId: result.id,
    after: { name: dto.name },
    ipAddress: ipAddress ?? null,
  });
  return { message: 'App successfully created. You are the Owner!', data: result };
  }

  // 2. KARYAWAN MINTA GABUNG (Pakai API Key toko)
  async requestJoinApp(userId: string, apiKey: string, ipAddress?: string | null) {
    // Cari tokonya berdasarkan apiKey
    const targetApp = await this.db.select().from(schema.apps).where(eq(schema.apps.apiKey, apiKey)).limit(1);
    
    if (!targetApp[0]) throw new NotFoundException('Invalid app API Key.');
    const appId = targetApp[0].id;

    // Cek apakah udah pernah join
    const existing = await this.db.select().from(schema.userApps)
      .where(and(eq(schema.userApps.userId, userId), eq(schema.userApps.appId, appId))).limit(1);

    if (existing[0]) throw new BadRequestException('You are already registered in this app with status: ' + existing[0].status);

    // Insert dengan status PENDING
    await this.db.insert(schema.userApps).values({
      userId: userId,
      appId: appId,
      role: APP_ROLES.STAFF,
      status: JOIN_STATUS.PENDING,
    });

    await this.auditService.log({
    appId: targetApp[0].id,
    userId,
    action: AUDIT_ACTIONS.REQUEST_JOIN,
    entity: 'userApps',
    ipAddress: ipAddress ?? null,
  });
  return { message: 'Join request sent! Waiting for Owner approval.' };
  }

  // 3. OWNER LIHAT DAFTAR KARYAWAN
  async getAppMembers(ownerId: string, appId: string, pagination: PaginationDto) {
  await this.verifyOwner(ownerId, appId);

  const { page = 1, limit = 20, offset } = pagination;

  const [members, [{ total }]] = await Promise.all([
    this.db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.userApps.role,
        status: schema.userApps.status,
      })
      .from(schema.userApps)
      .innerJoin(schema.users, eq(schema.userApps.userId, schema.users.id))
      .where(eq(schema.userApps.appId, appId))
      .limit(limit)
      .offset(offset),

    this.db
      .select({ total: count() })
      .from(schema.userApps)
      .where(eq(schema.userApps.appId, appId)),
  ]);

  return {
    message: 'Member list successfully retrieved.',
    ...paginate(members, Number(total), page, limit),
  };
}

  // 4. OWNER APPROVE KARYAWAN PENDING
  async approveMember(ownerId: string, appId: string, targetUserId: string, ipAddress?: string | null) {
    // Cek dulu apakah dia beneran OWNER
    await this.verifyOwner(ownerId, appId);

    const updated = await this.db.update(schema.userApps)
      .set({ status: JOIN_STATUS.ACTIVE })
      .where(and(eq(schema.userApps.appId, appId), eq(schema.userApps.userId, targetUserId), eq(schema.userApps.status, JOIN_STATUS.PENDING),))
      .returning();

    if (!updated[0]) throw new NotFoundException('Member not found or status is not PENDING.');

    await this.auditService.log({
    appId,
    userId: ownerId,
    action: AUDIT_ACTIONS.APPROVE_MEMBER,
    entity: 'userApps',
    entityId: targetUserId,
    after: { status: JOIN_STATUS.ACTIVE },
    ipAddress: ipAddress ?? null,
  });
  return { message: 'Member successfully approved.' };
  }

  async removeMember(ownerId: string, appId: string, targetUserId: string, ipAddress?: string | null) { // ✅ new method
    await this.verifyOwner(ownerId, appId);

    // Owner tidak bisa remove dirinya sendiri
    if (ownerId === targetUserId) {
      throw new BadRequestException('Owner cannot remove themselves from the app.');
    }

    const deleted = await this.db
      .update(schema.userApps)
      .set({ status: JOIN_STATUS.REJECTED })
      .where(and(
        eq(schema.userApps.appId, appId),
        eq(schema.userApps.userId, targetUserId),
      ))
      .returning();

    if (!deleted[0]) throw new NotFoundException('Member not found in this app.');

    await this.auditService.log({
    appId,
    userId: ownerId,
    action: AUDIT_ACTIONS.REMOVE_MEMBER,
    entity: 'userApps',
    entityId: targetUserId,
    after: { status: JOIN_STATUS.REJECTED },
    ipAddress: ipAddress ?? null,
  });
  return { message: 'Member successfully removed.' };
  }

  // --- Fungsi Bantuan untuk Cek Keamanan ---
  private async verifyOwner(userId: string, appId: string) {
    const isOwner = await this.db.select().from(schema.userApps)
      .where(and(
        eq(schema.userApps.userId, userId), 
        eq(schema.userApps.appId, appId),
        eq(schema.userApps.role, 'OWNER')
      )).limit(1);

    if (!isOwner[0]) throw new UnauthorizedException('Access denied. You are not the Owner of this app.');
  }
}