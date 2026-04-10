// cotebek/src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';

@Controller('reports')
@UseGuards(ApiKeyGuard) // Selalu amankan API-mu!
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Ambil appId dari satpam (API Key yang lagi dipakai)
    const appId = request.appInfo.id;
    
    return this.reportsService.getSummary(appId, startDate, endDate);
  }

  @Get('top-items')
  getTopItems(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.reportsService.getTopItems(appId, startDate, endDate);
  }

  // --- SALES TREND (Grafik Garis) ---
  @Get('sales-trend')
  getSalesTrend(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.reportsService.getSalesTrend(appId, startDate, endDate);
  }

  // --- PAYMENT METHODS (Grafik Lingkaran) ---
  @Get('payment-methods')
  getPaymentMethods(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.reportsService.getPaymentMethods(appId, startDate, endDate);
  }

  @Get('overview')
getOverview(@Req() request: any) {
  return this.reportsService.getOverview(request.appInfo.id);
}
}