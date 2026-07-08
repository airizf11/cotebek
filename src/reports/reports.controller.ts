// cotebek/src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';

@ApiTags('Reports')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('reports')
@UseGuards(DualAuthGuard, RolesGuard) // Selalu amankan API-mu!
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getSummary(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Ambil appId dari satpam (API Key yang lagi dipakai)
    const appId = request.appInfo.id;

    return this.reportsService.getSummary(appId, startDate, endDate);
  }

  @Get('promo-budget')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getPromoBudget(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.reportsService.getPromoBudget(appId, startDate, endDate);
  }

  @Get('top-items')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
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
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
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
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  getPaymentMethods(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appId = request.appInfo.id;
    return this.reportsService.getPaymentMethods(appId, startDate, endDate);
  }

  @Get('overview')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  getOverview(@Req() request: any) {
    return this.reportsService.getOverview(request.appInfo.id);
  }
}
