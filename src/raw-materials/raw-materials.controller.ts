// cotebek/src/raw-materials/raw-materials.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { DualAuthGuard } from '../auth/dual-auth/dual-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { APP_ROLES } from '../common/constants/enums.constant';

@ApiTags('Raw Materials')
@ApiSecurity('ApiKey')
@ApiBearerAuth('JWT')
@Controller('raw-materials')
@UseGuards(DualAuthGuard, RolesGuard)
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Post()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  create(@Req() req: any, @Body() dto: CreateRawMaterialDto) {
    return this.rawMaterialsService.create(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Get()
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findAll(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.rawMaterialsService.findAll(
      req.appInfo.id,
      includeInactive === 'true',
    );
  }

  @Put(':id')
  @Roles(APP_ROLES.DEV, APP_ROLES.OWNER, APP_ROLES.ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRawMaterialDto,
  ) {
    return this.rawMaterialsService.update(req.appInfo.id, id, dto);
  }
}
