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

@Controller('app-settings')
@UseGuards(ApiKeyGuard)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.appSettingsService.findAll(req.appInfo.id);
  }

  @Get(':key')
  findOne(@Req() req: any, @Param('key') key: string) {
    return this.appSettingsService.findOne(req.appInfo.id, key);
  }

  @Post()
  upsert(@Req() req: any, @Body() dto: UpsertSettingDto) {
    return this.appSettingsService.upsert(req.appInfo.id, dto);
  }

  @Post('bulk')
  bulkUpsert(@Req() req: any, @Body() dto: BulkUpsertSettingsDto) {
    return this.appSettingsService.bulkUpsert(req.appInfo.id, dto);
  }

  @Delete(':key')
  remove(@Req() req: any, @Param('key') key: string) {
    return this.appSettingsService.remove(req.appInfo.id, key);
  }
}