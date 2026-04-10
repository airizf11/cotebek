// cotebek/src/transactions/transactions.module.ts
import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AuditModule } from 'src/common/audit.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
