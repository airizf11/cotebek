// cotebek/src/auth/auth.service.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import * as crypto from 'crypto';
import { AuditService } from 'src/common/services/audit.service';
import { AUDIT_ACTIONS } from 'src/common/constants/enums.constant';
import * as bcrypt from 'bcrypt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

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
  async cleanupExpiredTokens(): Promise<number> {
    const deleted = await this.db
      .delete(schema.refreshTokens)
      .where(lt(schema.refreshTokens.expiresAt, new Date())) // ← semua yang sudah lewat
      .returning({ id: schema.refreshTokens.id });

    return deleted.length;
  }

  async login(email: string, password: string, ipAddress?: string | null) {
    // Cari user by email
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = users[0];

    // Jangan bedain "user tidak ada" vs "password salah"
    // → response sama untuk keduanya (security best practice)
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // ← Log failed login attempt juga — penting untuk detect brute force
      await this.auditService.log({
        appId: null,
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        entity: 'users',
        entityId: user.id,
        before: null,
        after: { success: false, reason: 'invalid_password' },
        ipAddress: ipAddress ?? null,
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(user.id, refreshToken);

    // ← Log successful login
    await this.auditService.log({
      appId: null,
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entity: 'users',
      entityId: user.id,
      before: null,
      after: { success: true },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Login successful.',
      data: { accessToken, refreshToken },
    };
  }

  async loginWithGoogle(idToken: string, ipAddress?: string | null) {
    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token.');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Invalid Google token payload.');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email is not verified.');
    }

    const googleSub = payload.sub;
    const email = payload.email;

    // 1. Cek apakah akun Google ini sudah pernah dipakai login sebelumnya
    const linkedAccount = await this.db
      .select({ userId: schema.accounts.userId })
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.provider, 'google'),
          eq(schema.accounts.providerAccountId, googleSub),
        ),
      )
      .limit(1);

    let userId: string;

    if (linkedAccount[0]) {
      userId = linkedAccount[0].userId;
    } else {
      // 2. Belum pernah — cek apakah user dengan email ini sudah ada
      //    (misal dulu daftar manual, sekarang link akun Google)
      const existingUser = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser[0]) {
        userId = existingUser[0].id;
      } else {
        // 3. User baru sepenuhnya
        const newUser = await this.db
          .insert(schema.users)
          .values({
            email,
            name: payload.name ?? null,
            image: payload.picture ?? null,
            emailVerified: new Date(),
          })
          .returning({ id: schema.users.id });

        userId = newUser[0].id;
      }

      // Link akun Google ke user (baru atau existing)
      await this.db.insert(schema.accounts).values({
        userId,
        type: 'oidc',
        provider: 'google',
        providerAccountId: googleSub,
      });
    }

    // Tempelin undangan yang nunggu (kalau ada) — Owner invite duluan
    // sebelum orangnya sempet login pertama kali
    const pendingInvites = await this.db
      .select()
      .from(schema.appInvites)
      .where(eq(schema.appInvites.email, email));

    for (const invite of pendingInvites) {
      await this.db.insert(schema.userApps).values({
        userId,
        appId: invite.appId,
        role: invite.role,
        status: 'ACTIVE',
      });
      await this.db
        .delete(schema.appInvites)
        .where(eq(schema.appInvites.id, invite.id));
    }

    const accessToken = this.generateAccessToken({ sub: userId, email });
    const refreshToken = this.generateRefreshToken();
    await this.saveRefreshToken(userId, refreshToken);

    await this.auditService.log({
      appId: null,
      userId,
      action: AUDIT_ACTIONS.USER_LOGIN,
      entity: 'users',
      entityId: userId,
      before: null,
      after: { success: true, method: 'google' },
      ipAddress: ipAddress ?? null,
    });

    return {
      message: 'Login successful.',
      data: { accessToken, refreshToken },
    };
  }
}
