// cotebek/src/orders/orders.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
// import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';

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
}