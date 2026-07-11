// cotebek/src/orders/orders.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { MarkPaidDto } from './dto/mark-paid.dto';

@ApiTags('Orders')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('orders')
@SkipThrottle({ strict: true })
@UseGuards(DualAuthGuard) // <-- Pasang Satpam di sini!
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created.' })
  create(@Req() request: any, @Body() createOrderDto: CreateOrderDto) {
    // Ambil identitas cabang usaha dari satpam
    const appId = request.appInfo.id;
    const handledBy = request.user?.id ?? null; // ✅ dari JWT jika ada
    const ipAddress = request.ip ?? null; // ✅ Express built-in

    // Lempar ke service
    return this.ordersService.create(
      appId,
      createOrderDto,
      handledBy,
      ipAddress,
    );
  }

  @Get()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get all orders with filters' })
  @ApiResponse({ status: 200, description: 'Order list retrieved.' })
  findAll(@Req() req: any, @Query() query: QueryOrderDto) {
    return this.ordersService.findAll(req.appInfo.id, query);
  }

  @Get('active')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get all non-DONE orders sorted by due date' })
  @ApiResponse({ status: 200, description: 'Active orders retrieved.' })
  getActiveOrders(@Req() req: any) {
    return this.ordersService.getActiveOrders(req.appInfo.id);
  }

  @Get('track/:orderNumber')
  @Public()
  @ApiOperation({
    summary: 'Public order tracking by order number (no auth required)',
  })
  @ApiResponse({ status: 200, description: 'Order tracking info retrieved.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackOrder(orderNumber);
  }

  @Get(':id/receipt')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get receipt data for an order (ready to render)' })
  @ApiResponse({ status: 200, description: 'Receipt data retrieved.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  getReceiptData(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getReceiptData(req.appInfo.id, id);
  }

  @Get(':id')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get order detail with items' })
  @ApiResponse({ status: 200, description: 'Order detail retrieved.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.appInfo.id, id);
  }

  @Patch(':id/status') // ✅ PATCH — partial update
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Update order status (state machine enforced)' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
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

  @Patch(':id/pay')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Mark an unpaid order as paid' })
  markAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.ordersService.markAsPaid(
      req.appInfo.id,
      id,
      dto.paymentMethod,
      req.user?.id,
      req.ip,
    );
  }
}
