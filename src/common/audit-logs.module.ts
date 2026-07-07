// cotebek/src/common/audit-logs.module.ts
import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { AuditModule } from './audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
