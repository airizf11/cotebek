// cotebek/src/apps/apps.module.ts
import { Module } from '@nestjs/common';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/common/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AppsController],
  providers: [AppsService],
})
export class AppsModule {}
