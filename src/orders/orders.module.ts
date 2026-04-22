// cotebek/src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/common/audit.module';
import { PromosModule } from 'src/promos/promos.module';

@Module({
  imports: [AuthModule, AuditModule, PromosModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
