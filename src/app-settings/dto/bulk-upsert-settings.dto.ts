// cotebek/src/app-settings/dto/bulk-upsert-settings.dto.ts
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertSettingDto } from './upsert-setting.dto';

export class BulkUpsertSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSettingDto)
  settings: UpsertSettingDto[];
}