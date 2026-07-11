// cotebek/src/reports/net-profit.service.ts
import { Injectable } from '@nestjs/common';
import { OrdersReportsService } from './orders-reports.service';
import { TransactionsReportsService } from './transactions-reports.service';

@Injectable()
export class NetProfitService {
  constructor(
    private readonly ordersReportsService: OrdersReportsService,
    private readonly transactionsReportsService: TransactionsReportsService,
  ) {}

  async getNetProfit(appId: string, startDate?: string, endDate?: string) {
    const [summary, expense] = await Promise.all([
      this.ordersReportsService.getSummary(appId, startDate, endDate),
      this.transactionsReportsService.getExpenseSummary(
        appId,
        startDate,
        endDate,
      ),
    ]);

    const grossProfit = summary.data.grossProfit;
    const operatingExpense = expense.data.totalOut;

    return {
      message: 'Net profit successfully calculated.',
      data: {
        revenue: summary.data.revenue,
        cogs: summary.data.cogs,
        grossProfit,
        operatingExpense,
        netProfit: grossProfit - operatingExpense,
      },
    };
  }
}
