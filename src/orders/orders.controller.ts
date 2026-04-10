// cotebek/src/orders/orders.controller.ts
import { Controller, Post, Body, UseGuards, Req, Query, Get, Param, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
// import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(DualAuthGuard) // <-- Pasang Satpam di sini!
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() request: any, @Body() createOrderDto: CreateOrderDto) {
    // Ambil identitas cabang usaha dari satpam
    const appId = request.appInfo.id;
    const handledBy = request.user?.id ?? null;           // ✅ dari JWT jika ada
    const ipAddress = request.ip ?? null;                 // ✅ Express built-in
    
    // Lempar ke service
    return this.ordersService.create(appId, createOrderDto, handledBy, ipAddress);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryOrderDto) {
    return this.ordersService.findAll(req.appInfo.id, query);
  }

  @Get('active')
  getActiveOrders(@Req() req: any) {
    return this.ordersService.getActiveOrders(req.appInfo.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.appInfo.id, id);
  }

  @Patch(':id/status')                              // ✅ PATCH — partial update
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      req.appInfo.id,
      id,
      dto,
      req.user?.id,
      req.ip,
    );
  }
}