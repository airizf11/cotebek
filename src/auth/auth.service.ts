// cotebek/src/auth/auth.service.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, gt } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Generate token pair ───────────────────────────────────────────
  generateAccessToken(payload: { sub: string; email: string; role?: string }) {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // ─── Simpan refresh token ke DB ────────────────────────────────────
  async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 hari

    await this.db.insert(schema.refreshTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  // ─── Refresh: rotate token ─────────────────────────────────────────
  async refresh(refreshToken: string) {
    // Cari token di DB yang masih valid
    const existing = await this.db
      .select({
        id: schema.refreshTokens.id,
        userId: schema.refreshTokens.userId,
        email: schema.users.email,
      })
      .from(schema.refreshTokens)
      .innerJoin(schema.users, eq(schema.refreshTokens.userId, schema.users.id))
      .where(
        and(
          eq(schema.refreshTokens.token, refreshToken),
          gt(schema.refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const { id, userId, email } = existing[0];

    // Hapus token lama (rotate)
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.id, id));

    // Generate token baru
    const newAccessToken = this.generateAccessToken({ sub: userId, email });
    const newRefreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(userId, newRefreshToken);

    return {
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  // ─── Logout: hapus refresh token ──────────────────────────────────
  async logout(refreshToken: string) {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.token, refreshToken));

    return { message: 'Logged out successfully.' };
  }

  // ─── Cleanup: hapus semua expired tokens (bisa dipanggil via cron) ─
  async cleanupExpiredTokens() {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.expiresAt, new Date()));
  }
}
