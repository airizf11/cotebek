// cotebek/src/transactions/transactions.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@ApiTags('Transactions')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('transactions')
@UseGuards(DualAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Record a new cash flow transaction' })
  @ApiResponse({ status: 201, description: 'Transaction recorded.' })
  create(@Req() req: any, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Get()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Get cash flow history with summary (Owner/Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Transactions retrieved.' })
  findAll(
    @Req() req: any,
    @Query() pagination: PaginationDto,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.transactionsService.findAll(
      req.appInfo.id,
      pagination,
      startDate,
      endDate,
      type,
    );
  }
}
