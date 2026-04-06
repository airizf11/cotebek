// cotebek/src/auth/session.guard.ts
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, gt } from 'drizzle-orm';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    console.log("🛡️ [DEBUG NESTJS] Auth Header masuk:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Login dibutuhkan! (Token tidak ditemukan)');
    }

    // Ambil tokennya (misal: "Bearer abc-123" -> ambil "abc-123")
    const sessionToken = authHeader.split(' ')[1];

    // Cek ke tabel sessions buatan NextAuth
    // Syarat: tokennya harus sama, dan belum expired (expires > waktu sekarang)
    const activeSession = await this.db
      .select({
        userId: schema.sessions.userId,
        userName: schema.users.name,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(
        eq(schema.sessions.sessionToken, sessionToken)
      )
      .limit(1);

    if (!activeSession[0]) {
      throw new UnauthorizedException('Sesi telah berakhir atau token tidak valid. Silakan login ulang.');
    }

    // Kalau lolos, tempelkan data user ke request biar bisa dibaca di Controller!
    request.user = { id: activeSession[0].userId, name: activeSession[0].userName };

    return true;
  }
}