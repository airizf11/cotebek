// cotebek/src/common/services/audit.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { AuditAction } from '../constants/enums.constant';
import { PaginationDto } from '../dto/pagination.dto';
import { paginate } from '../utils/paginate.util';
import { eq, desc, count } from 'drizzle-orm';

export interface AuditPayload {
  appId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async log(payload: AuditPayload): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      appId: payload.appId,
      userId: payload.userId ?? null,
      actorType: payload.userId ? 'HUMAN' : 'SYSTEM',
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      before: payload.before ?? null,
      after: payload.after ?? null,
      ipAddress: payload.ipAddress ?? null,
    });
  }

  async findAll(appId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;

    const [logs, totalResult] = await Promise.all([
      this.db
        .select({
          id: schema.auditLogs.id,
          actorType: schema.auditLogs.actorType,
          userId: schema.auditLogs.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          action: schema.auditLogs.action,
          entity: schema.auditLogs.entity,
          entityId: schema.auditLogs.entityId,
          before: schema.auditLogs.before,
          after: schema.auditLogs.after,
          ipAddress: schema.auditLogs.ipAddress,
          createdAt: schema.auditLogs.createdAt,
        })
        .from(schema.auditLogs)
        .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
        .where(eq(schema.auditLogs.appId, appId))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(limit)
        .offset(pagination.offset),

      this.db
        .select({ total: count() })
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.appId, appId)),
    ]);

    return {
      message: 'Audit log successfully retrieved.',
      ...paginate(logs, Number(totalResult[0].total), page, limit),
    };
  }
}
