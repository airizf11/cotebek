// cotebek/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { AuthModule } from 'src/auth/auth.module';
import { TransactionsReportsService } from './transactions-reports.service';
import { OrdersReportsService } from './orders-reports.service';
import { NetProfitService } from './net-profit.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    OrdersReportsService,
    TransactionsReportsService,
    NetProfitService,
  ],
})
export class ReportsModule {}
