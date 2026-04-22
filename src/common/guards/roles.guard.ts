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
    // Ambil roles yang dibutuhkan dari decorator
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Kalau endpoint tidak pakai @Roles() → bebas akses (guard tidak aktif)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const appInfo = request.appInfo;

    // Kalau tidak ada user (anonymous) tapi endpoint butuh role → tolak
    if (!user?.id) {
      throw new ForbiddenException(
        'Authentication required to access this resource.',
      );
    }

    // Kalau tidak ada appInfo → endpoint tidak pakai ApiKey guard, skip role check
    if (!appInfo?.id) return true;

    // Query role user di app ini
    const membership = await this.db
      .select({ role: schema.userApps.role })
      .from(schema.userApps)
      .where(
        and(
          eq(schema.userApps.userId, user.id),
          eq(schema.userApps.appId, appInfo.id),
          eq(schema.userApps.status, JOIN_STATUS.ACTIVE),
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

    // Attach role ke request supaya bisa dipakai di controller/service kalau perlu
    request.user.role = userRole;

    return true;
  }
}
