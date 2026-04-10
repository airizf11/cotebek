// cotebek/src/customers/customers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';

@Controller('customers')
@UseGuards(ApiKeyGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(req.appInfo.id, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryCustomerDto) {
    return this.customersService.findAll(req.appInfo.id, query);
  }

  @Get('search/phone')
  findByPhone(@Req() req: any, @Query('phone') phone: string) {
    return this.customersService.findByPhone(req.appInfo.id, phone);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOne(req.appInfo.id, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(req.appInfo.id, id, dto);
  }
}