// cotebek/src/common/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';

@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}