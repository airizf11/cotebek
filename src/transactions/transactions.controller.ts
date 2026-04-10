// cotebek/src/transactions/transactions.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Req, 
  Get,
  Query
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('transactions')
@UseGuards(ApiKeyGuard) // <-- Pasang satpam di seluruh endpoint transaksi!
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
create(@Req() req: any, @Body() dto: CreateTransactionDto) {
  return this.transactionsService.create(req.appInfo.id, dto, req.user?.id, req.ip); // ✅
}

  @Get()
findAll(
  @Req() req: any,
  @Query() pagination: PaginationDto,        // ✅
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