// cotebek/src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppRole } from '../constants/enums.constant';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { and, eq } from 'drizzle-orm';
import { JOIN_STATUS } from '../constants/enums.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Tidak ada @Roles() → skip guard sepenuhnya
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const appInfo = request.appInfo;

    // Ada @Roles() tapi tidak ada appInfo → endpoint ini tidak butuh
    // role-based check via userApps (contoh: /apps/* yang verify lewat service)
    if (!appInfo?.id) return true;

    // Ada @Roles() dan ada appInfo → user wajib login
    if (!user?.id) return true;

    // Cek membership & role user di app ini
    const membership = await this.db
      .select({ role: schema.userApps.role })
      .from(schema.userApps)
      .where(
        and(
          eq(schema.userApps.userId, user.id),
          eq(schema.userApps.appId, appInfo.id),
          eq(schema.userApps.status, JOIN_STATUS.ACTIVE), // ← pastikan sudah ACTIVE
        ),
      )
      .limit(1);

    if (!membership[0]) {
      throw new ForbiddenException('You are not an active member of this app.');
    }

    const userRole = membership[0].role as AppRole;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}.`,
      );
    }

    // Inject role ke request.user supaya bisa dipakai downstream
    request.user.role = userRole;

    return true;
  }
}
