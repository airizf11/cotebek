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
  Delete,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Customers')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('customers')
@SkipThrottle({ strict: true })
@UseGuards(DualAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Get()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findAll(@Req() req: any, @Query() query: QueryCustomerDto) {
    return this.customersService.findAll(req.appInfo.id, query);
  }

  @Get('search/phone')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findByPhone(@Req() req: any, @Query('phone') phone: string) {
    return this.customersService.findByPhone(req.appInfo.id, phone);
  }

  @Get(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOne(req.appInfo.id, id);
  }

  @Put(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      req.appInfo.id,
      id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Delete(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.customersService.remove(
      req.appInfo.id,
      id,
      req.user?.id,
      req.ip,
    );
  }
}
