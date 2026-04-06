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

@Controller('transactions')
@UseGuards(ApiKeyGuard) // <-- Pasang satpam di seluruh endpoint transaksi!
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Req() request: any, @Body() createTransactionDto: CreateTransactionDto) {
    // Ambil info usaha dari request yang udah diloloskan satpam
    const appId = request.appInfo.id; 
    
    // Kirim ke service buat dicatat ke database
    return this.transactionsService.create(appId, createTransactionDto);
  }

  @Get()
  findAll(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string, // Filter opsional: 'IN' atau 'OUT'
  ) {
    const appId = request.appInfo.id;
    return this.transactionsService.findAll(appId, startDate, endDate, type);
  }
}