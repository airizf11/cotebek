// cotebek/src/auth/token-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Running expired refresh token cleanup...');
    try {
      const deleted = await this.authService.cleanupExpiredTokens();
      this.logger.log(`Cleanup done. ${deleted} expired token(s) removed.`);
    } catch (error) {
      this.logger.error(
        'Token cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
