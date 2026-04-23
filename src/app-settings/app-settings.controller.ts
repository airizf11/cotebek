// cotebek/src/app-settings/app-settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { BulkUpsertSettingsDto } from './dto/bulk-upsert-settings.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { APP_ROLES } from 'src/common/constants/enums.constant';

@ApiTags('App Settings')
@ApiSecurity('ApiKey')
@Controller('app-settings')
@UseGuards(ApiKeyGuard)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findAll(@Req() req: any) {
    return this.appSettingsService.findAll(req.appInfo.id);
  }

  @Get(':key')
  @Roles(APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.STAFF)
  findOne(@Req() req: any, @Param('key') key: string) {
    return this.appSettingsService.findOne(req.appInfo.id, key);
  }

  @Post()
  @Roles(APP_ROLES.OWNER)
  upsert(@Req() req: any, @Body() dto: UpsertSettingDto) {
    return this.appSettingsService.upsert(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Post('bulk')
  @Roles(APP_ROLES.OWNER)
  bulkUpsert(@Req() req: any, @Body() dto: BulkUpsertSettingsDto) {
    return this.appSettingsService.bulkUpsert(
      req.appInfo.id,
      dto,
      req.user?.id,
      req.ip,
    );
  }

  @Delete(':key')
  @Roles(APP_ROLES.OWNER)
  remove(@Req() req: any, @Param('key') key: string) {
    return this.appSettingsService.remove(
      req.appInfo.id,
      key,
      req.user?.id,
      req.ip,
    );
  }
}
