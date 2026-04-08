// cotebek/src/auth/dual-auth/dual-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // --- Step 1: Validate API Key (required) ---
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) throw new UnauthorizedException('API Key not found.');

    const foundApp = await this.db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.apiKey, apiKey))
      .limit(1);

    if (!foundApp[0] || !foundApp[0].isActive) {
      throw new UnauthorizedException('Invalid or inactive API Key.');
    }

    request.appInfo = foundApp[0];

    // --- Step 2: Validate JWT (optional) ---
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        request.user = { id: payload.sub, email: payload.email };
      } catch {
        // JWT invalid/expired — tidak throw, cukup null
        request.user = null;
      }
    } else {
      request.user = null;
    }

    return true;
  }
}