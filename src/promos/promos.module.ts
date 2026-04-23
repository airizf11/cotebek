// cotebek/src/promos/promos.module.ts
import { Module } from '@nestjs/common';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/common/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService], // ← export PromosService supaya bisa dipakai OrdersModule
})
export class PromosModule {}
