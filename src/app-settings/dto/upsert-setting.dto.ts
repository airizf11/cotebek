// cotebek/src/app-settings/dto/upsert-setting.dto.ts
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @IsDefined() // ← allow any type (string, number, boolean, object, array)
  //   tapi tolak undefined dan null
  value: unknown;
}
