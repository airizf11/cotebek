// cotebek/src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { OrdersReportsService } from './orders-reports.service';
import { TransactionsReportsService } from './transactions-reports.service';
import { NetProfitService } from './net-profit.service';

@ApiTags('Reports')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('reports')
@SkipThrottle({ strict: true })
@UseGuards(DualAuthGuard, RolesGuard) // Selalu amankan API-mu!
export class ReportsController {
  constructor(
    private readonly ordersReportsService: OrdersReportsService,
    private readonly transactionsReportsService: TransactionsReportsService,
    private readonly netProfitService: NetProfitService,
  ) {}

  @Get('summary')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getSummary(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Ambil appId dari satpam (API Key yang lagi dipakai)
    const appId = request.appInfo.id;

    return this.ordersReportsService.getSummary(appId, startDate, endDate);
  }

  @Get('promo-budget')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getPromoBudget(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.ordersReportsService.getPromoBudget(appId, startDate, endDate);
  }

  @Get('top-items')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  getTopItems(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.ordersReportsService.getTopItems(appId, startDate, endDate);
  }

  // --- SALES TREND (Grafik Garis) ---
  @Get('sales-trend')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  getSalesTrend(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.ordersReportsService.getSalesTrend(appId, startDate, endDate);
  }

  // --- PAYMENT METHODS (Grafik Lingkaran) ---
  @Get('payment-methods')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  getPaymentMethods(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.ordersReportsService.getPaymentMethods(
      appId,
      startDate,
      endDate,
    );
  }

  @Get('overview')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  getOverview(@Req() request: any) {
    return this.ordersReportsService.getOverview(request.appInfo.id);
  }

  @Get('expense-summary')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getExpenseSummary(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsReportsService.getExpenseSummary(
      request.appInfo.id,
      startDate,
      endDate,
    );
  }

  @Get('expense-by-category')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getExpenseByCategory(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsReportsService.getExpenseByCategory(
      request.appInfo.id,
      startDate,
      endDate,
    );
  }

  @Get('net-profit')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getNetProfit(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.netProfitService.getNetProfit(
      request.appInfo.id,
      startDate,
      endDate,
    );
  }
}
