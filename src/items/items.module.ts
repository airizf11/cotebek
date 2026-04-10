// cotebek/src/items/items.module.ts
import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { AuthModule } from 'src/auth/auth.module';
import { AuditModule } from 'src/common/audit.module';

@Module({
  imports: [AuthModule, AuditModule], 
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
