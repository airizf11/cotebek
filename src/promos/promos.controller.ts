// cotebek/src/promos/promos.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ApplyPromoDto } from './dto/apply-promo.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';

@ApiTags('Promos')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('promos')
@UseGuards(DualAuthGuard, RolesGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a new promo (Owner/Admin only)' })
  @ApiResponse({ status: 201, description: 'Promo created.' })
  @ApiResponse({ status: 409, description: 'Promo code already exists.' })
  create(@Req() req: any, @Body() dto: CreatePromoDto) {
    return this.promosService.create(req.appInfo.id, dto, req.user?.id, req.ip);
  }

  @Get()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get all promos' })
  @ApiResponse({ status: 200, description: 'Promo list retrieved.' })
  findAll(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.promosService.findAll(req.appInfo.id, pagination);
  }

  @Get(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get promo detail by ID' })
  @ApiResponse({ status: 200, description: 'Promo detail retrieved.' })
  @ApiResponse({ status: 404, description: 'Promo not found.' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.promosService.findOne(req.appInfo.id, id);
  }

  @Put(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a promo (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo updated.' })
  @ApiResponse({ status: 404, description: 'Promo not found.' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.promosService.update(
      req.appInfo.id,
      id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Delete(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Deactivate a promo (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo deactivated.' })
  @ApiResponse({ status: 404, description: 'Promo not found.' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.promosService.remove(req.appInfo.id, id, req.user?.id, req.ip);
  }

  // ─── Check promo sebelum checkout ────
  @Post('check')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({
    summary: 'Preview discount before applying promo at checkout',
  })
  @ApiResponse({
    status: 200,
    description: 'Promo valid, discount amount returned.',
  })
  @ApiResponse({
    status: 400,
    description: 'Promo invalid (expired, limit reached, etc).',
  })
  @ApiResponse({ status: 404, description: 'Promo code not found.' })
  @ApiQuery({ name: 'orderAmount', required: true, type: Number })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  checkPromo(
    @Req() req: any,
    @Body() dto: ApplyPromoDto,
    @Query('orderAmount') orderAmount: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.promosService.checkPromo(
      req.appInfo.id,
      dto.code,
      Number(orderAmount),
      customerId,
    );
  }
}
