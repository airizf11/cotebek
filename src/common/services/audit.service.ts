// cotebek/src/common/services/audit.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { AuditAction } from '../constants/enums.constant';

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
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      before: payload.before ?? null,
      after: payload.after ?? null,
      ipAddress: payload.ipAddress ?? null,
    });
  }
}
