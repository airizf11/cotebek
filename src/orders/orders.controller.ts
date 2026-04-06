// cotebek/src/orders/orders.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';

@Controller('orders')
@UseGuards(ApiKeyGuard) // <-- Pasang Satpam di sini!
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() request: any, @Body() createOrderDto: CreateOrderDto) {
    // Ambil identitas cabang usaha dari satpam
    const appId = request.appInfo.id;
    
    // Lempar ke service
    return this.ordersService.create(appId, createOrderDto);
  }
}