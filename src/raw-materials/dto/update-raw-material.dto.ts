// cotebek/src/raw-materials/dto/update-raw-material.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateRawMaterialDto } from './create-raw-material.dto';

export class UpdateRawMaterialDto extends PartialType(CreateRawMaterialDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
