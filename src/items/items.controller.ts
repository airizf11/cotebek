// cotebek/src/items/items.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import {
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { DualAuthGuard } from 'src/auth/dual-auth/dual-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { QueryItemDto } from './dto/query-item.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Items')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('items')
@SkipThrottle({ strict: true })
@UseGuards(DualAuthGuard, RolesGuard) // <-- Wajib Pasang Satpam!
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a new item (Owner/Admin only)' })
  @ApiResponse({ status: 201, description: 'Item created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Req() req: any, @Body() dto: CreateItemDto) {
    return this.itemsService.create(req.appInfo.id, dto, req.user?.id, req.ip);
  }

  @Get()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get all active items' })
  @ApiResponse({ status: 200, description: 'Item list retrieved.' })
  findAll(@Req() req: any, @Query() query: QueryItemDto) {
    return this.itemsService.findAll(
      req.appInfo.id,
      query,
      query.includeInactive === 'true',
    );
  }

  @Get(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  @ApiOperation({ summary: 'Get item detail by ID' })
  @ApiResponse({ status: 200, description: 'Item detail retrieved.' })
  @ApiResponse({ status: 404, description: 'Item not found.' })
  findOne(@Req() request: any, @Param('id') id: string) {
    return this.itemsService.findOne(request.appInfo.id, id);
  }

  // Gunakan PUT atau PATCH bebas, Nest bawaannya PATCH, tapi kita ubah ke PUT aja biar gampang
  @Put(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Update an item (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Item updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(
      req.appInfo.id,
      id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Delete(':id')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN)
  @ApiOperation({ summary: 'Soft-delete an item (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Item removed.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.itemsService.remove(req.appInfo.id, id, req.user?.id, req.ip);
  }
}
