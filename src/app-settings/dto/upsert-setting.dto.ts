// cotebek/src/app-settings/dto/upsert-setting.dto.ts
import { IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  key: string;

  value: any; // flexible — string, number, boolean, object
}